import type { UserRole } from '@/types';

export interface NewUserInput {
  email: string;
  displayName: string;
  role: UserRole;
  password: string;
}

/** Escape a string for safe embedding inside a single-quoted SQL literal. */
export function sqlEscape(value: string): string {
  return String(value).replace(/'/g, "''");
}

/**
 * Build a ready-to-run SQL block that provisions (or updates) one user in a
 * Supabase project. Mirrors the admin bootstrap in supabase/setup.sql:
 *  - bcrypt-hashes the password via Postgres crypt()
 *  - sets app_metadata.role so it lands in the signed JWT
 *  - creates the matching auth.identities row for email sign-in
 *  - sets token columns to '' (NULL there breaks GoTrue sign-in)
 * Safe to re-run: updates the row if the email already exists.
 */
export function buildCreateUserSql(input: NewUserInput): string {
  const email = sqlEscape(input.email.trim());
  const name = sqlEscape(input.displayName.trim());
  const password = sqlEscape(input.password);
  const role = input.role === 'admin' ? 'admin' : 'member';

  return `-- Time Portal — provision user: ${input.email.trim()} (role: ${role})
-- Paste into Supabase → SQL Editor → Run. Safe to re-run.
do $$
declare
  u_email text := '${email}';
  u_pass  text := '${password}';
  u_name  text := '${name}';
  u_role  text := '${role}';
  uid uuid;
begin
  select id into uid from auth.users where email = u_email;

  if uid is null then
    uid := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email,
      encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change,
      email_change_token_new, email_change_token_current,
      phone_change, phone_change_token, reauthentication_token
    ) values (
      '00000000-0000-0000-0000-000000000000',
      uid, 'authenticated', 'authenticated', u_email,
      crypt(u_pass, gen_salt('bf')), now(),
      jsonb_build_object('provider','email','providers',array['email'],'role',u_role),
      jsonb_build_object('display_name', u_name),
      now(), now(),
      '', '', '', '', '', '', '', ''
    );
    insert into auth.identities (
      id, user_id, identity_data, provider, provider_id,
      last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), uid,
      jsonb_build_object('sub', uid::text, 'email', u_email, 'email_verified', true),
      'email', u_email, now(), now(), now()
    );
    raise notice 'Created %', u_email;
  else
    update auth.users
      set encrypted_password = crypt(u_pass, gen_salt('bf')),
          email_confirmed_at = coalesce(email_confirmed_at, now()),
          raw_app_meta_data  = coalesce(raw_app_meta_data,'{}'::jsonb) || jsonb_build_object('role', u_role),
          raw_user_meta_data = coalesce(raw_user_meta_data,'{}'::jsonb) || jsonb_build_object('display_name', u_name),
          confirmation_token = coalesce(confirmation_token,''),
          recovery_token = coalesce(recovery_token,''),
          email_change = coalesce(email_change,''),
          email_change_token_new = coalesce(email_change_token_new,''),
          email_change_token_current = coalesce(email_change_token_current,''),
          phone_change = coalesce(phone_change,''),
          phone_change_token = coalesce(phone_change_token,''),
          reauthentication_token = coalesce(reauthentication_token,''),
          updated_at = now()
      where id = uid;
    raise notice 'Updated %', u_email;
  end if;
end$$;`;
}

/** Generate a reasonably strong temporary password (upper/lower/digits). */
export function generateTempPassword(length = 12): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  // Guarantee at least one upper, lower, digit.
  return `${out.slice(0, -3)}A9z`;
}
