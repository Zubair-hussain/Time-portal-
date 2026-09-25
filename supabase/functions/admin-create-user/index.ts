// Supabase Edge Function: admin-create-user
// Deploy with: supabase functions deploy admin-create-user
//
// SECURITY: This runs on Supabase's servers with the SERVICE ROLE key (never in
// the browser). It re-verifies that the CALLER's JWT has app_metadata.role = 'admin'
// before creating a new user. This is how the "only admins can add users" rule is
// enforced — there is no public sign-up anywhere in the app.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace('Bearer ', '');

  // Verify the caller and their role using the anon client bound to their token.
  const caller = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userData, error: userErr } = await caller.auth.getUser();
  if (userErr || !userData.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }
  const role = (userData.user.app_metadata as Record<string, unknown>)?.role;
  if (role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Forbidden: admin only' }), { status: 403 });
  }

  let body: { email?: string; displayName?: string; role?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 });
  }
  if (!body.email) {
    return new Response(JSON.stringify({ error: 'email is required' }), { status: 400 });
  }

  // Create the user with the service role. An invite email lets them set a password.
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const { error } = await admin.auth.admin.inviteUserByEmail(body.email, {
    data: { display_name: body.displayName ?? '' },
  });
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400 });
  }

  // Assign role via app_metadata (requires a follow-up update once the user exists).
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
