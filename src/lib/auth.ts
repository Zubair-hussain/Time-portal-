import type { PortalUser, UserRole } from '@/types';
import { getSupabase } from '@/lib/supabaseClient';
import { inspectJwt } from '@/lib/jwt';

/**
 * Auth flows for the Time Portal.
 *
 * IMPORTANT: There is NO public sign-up. `signUp` is intentionally absent from the
 * public surface — new accounts are provisioned by an admin (see `adminInviteUser`,
 * which requires an admin session and calls a secured Supabase Edge Function; the
 * service-role key never touches the browser).
 */

export interface Credentials {
  email: string;
  password: string;
}

/** Map a Supabase user + access token into our PortalUser shape. */
export function toPortalUser(
  id: string,
  email: string | undefined,
  accessToken: string | null,
  metaName?: string,
): PortalUser {
  const info = inspectJwt(accessToken);
  const role: UserRole = info.role;
  return {
    id,
    email: email ?? '',
    role,
    displayName: metaName?.trim() || (email ? email.split('@')[0] ?? email : 'Member'),
  };
}

export async function signIn({ email, password }: Credentials): Promise<PortalUser> {
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  if (!data.user || !data.session) throw new Error('Sign-in failed: no session returned');

  const displayName = (data.user.user_metadata?.display_name as string | undefined) ?? undefined;
  return toPortalUser(data.user.id, data.user.email, data.session.access_token, displayName);
}

export async function signOut(): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}

export async function getCurrentAccessToken(): Promise<string | null> {
  const supabase = getSupabase();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

const SETUP_HINT = 'Setup missing: run supabase/admin-create-user.sql in the Supabase SQL Editor once.';

function isMissingFunction(error: { code?: string; message: string }): boolean {
  return error.code === 'PGRST202' || /could not find the function/i.test(error.message);
}

export interface CreateUserInput {
  email: string;
  password: string;
  displayName: string;
  role: UserRole;
  /** Create unconfirmed so the user must click an emailed link before signing in. */
  requireConfirmation?: boolean;
}

/**
 * Admin-only user provisioning. Calls the `admin_create_user` Postgres function
 * (supabase/admin-create-user.sql). It is SECURITY DEFINER but refuses anyone whose
 * signed JWT is not role=admin, so the browser never needs a service key.
 */
export async function adminCreateUser(input: CreateUserInput): Promise<{ id: string }> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('admin_create_user', {
    p_email: input.email,
    p_password: input.password,
    p_display_name: input.displayName,
    p_role: input.role,
    p_require_confirmation: Boolean(input.requireConfirmation),
  });
  if (error) {
    if (isMissingFunction(error)) throw new Error(SETUP_HINT);
    throw new Error(error.message);
  }
  return { id: String(data) };
}

/**
 * Send (or re-send) the confirmation email for an unconfirmed user. This is the only
 * way to prove the person owns the inbox. It needs Supabase Auth to be able to send
 * mail: configure custom SMTP under Authentication -> SMTP (the built-in sender only
 * delivers to your own team members).
 */
export async function sendConfirmationEmail(email: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.auth.resend({ type: 'signup', email: email.trim().toLowerCase() });
  if (error) throw new Error(error.message);
}

export interface AdminUserRow {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  emailConfirmed: boolean;
  createdAt: string;
}

/** Admin-only: list every account with confirmation state (admin_list_users RPC). */
export async function adminListUsers(): Promise<AdminUserRow[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('admin_list_users');
  if (error) {
    if (isMissingFunction(error)) throw new Error(SETUP_HINT);
    throw new Error(error.message);
  }
  return ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
    id: String(r.id),
    email: String(r.email ?? ''),
    displayName: String(r.display_name ?? ''),
    role: r.role === 'admin' ? 'admin' : 'member',
    emailConfirmed: Boolean(r.email_confirmed),
    createdAt: String(r.created_at ?? ''),
  }));
}
