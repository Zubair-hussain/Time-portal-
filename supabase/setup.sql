-- =====================================================================
-- TIME PORTAL — COMPLETE SUPABASE SETUP (run this whole file once)
-- Paste into: Supabase Dashboard → SQL Editor → New query → Run
--
-- This single script does EVERYTHING:
--   1. Extensions
--   2. Schema (enum + time_entries table)
--   3. is_admin() helper (reads the verified JWT role claim)
--   4. Row Level Security policies + status-guard trigger
--   5. REALTIME (adds time_entries to the realtime publication)
--   6. AUTH — bootstraps the admin account:
--        email:    thezubairh@gmail.com
--        password: imam786123
--        role:     admin  (stored in app_metadata → lands in the JWT)
--
-- Safe to re-run: every step is guarded with IF NOT EXISTS / existence checks.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. EXTENSIONS
-- ---------------------------------------------------------------------
create extension if not exists pgcrypto;      -- gen_random_uuid(), crypt(), gen_salt()

-- ---------------------------------------------------------------------
-- 2. SCHEMA
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'entry_status') then
    create type entry_status as enum ('pending', 'approved', 'rejected');
  end if;
end$$;

create table if not exists public.time_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_seconds integer,
  note text default '',
  status entry_status not null default 'pending',
  created_at timestamptz not null default now()
);

create index if not exists time_entries_user_idx on public.time_entries (user_id);
create index if not exists time_entries_started_idx on public.time_entries (started_at);

-- ---------------------------------------------------------------------
-- 3. is_admin() — authoritative role check from the SIGNED JWT
--    app_metadata is only writable by the service role, so members
--    cannot promote themselves. This is what keeps the JWT "unbreakable"
--    for authorization: the claim is server-signed and re-checked here.
-- ---------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

-- ---------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY
-- ---------------------------------------------------------------------
alter table public.time_entries enable row level security;

drop policy if exists "read own or admin" on public.time_entries;
create policy "read own or admin" on public.time_entries
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "insert own" on public.time_entries;
create policy "insert own" on public.time_entries
  for insert with check (user_id = auth.uid());

drop policy if exists "update own not status" on public.time_entries;
create policy "update own not status" on public.time_entries
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "admin update all" on public.time_entries;
create policy "admin update all" on public.time_entries
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin delete" on public.time_entries;
create policy "admin delete" on public.time_entries
  for delete using (public.is_admin());

-- Block members from changing status (self-approval) even via direct API calls.
create or replace function public.enforce_status_rules()
returns trigger
language plpgsql
as $$
begin
  if not public.is_admin() and new.status is distinct from old.status then
    raise exception 'Only admins may change entry status';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_status_guard on public.time_entries;
create trigger trg_status_guard
  before update on public.time_entries
  for each row execute function public.enforce_status_rules();

-- ---------------------------------------------------------------------
-- 5. REALTIME
--    Adds the table to Supabase's realtime publication and enables full
--    row images so UPDATE/DELETE events carry the old + new values.
-- ---------------------------------------------------------------------
alter table public.time_entries replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) then
    create publication supabase_realtime;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'time_entries'
  ) then
    alter publication supabase_realtime add table public.time_entries;
  end if;
end$$;

-- ---------------------------------------------------------------------
-- 6. AUTH — bootstrap the admin account
--    email: thezubairh@gmail.com   password: imam786123   role: admin
--    Creates the auth.users row AND the matching auth.identities row so
--    email/password sign-in works. The password is bcrypt-hashed; the
--    role is written to app_metadata so it is embedded in every JWT.
-- ---------------------------------------------------------------------
do $$
declare
  admin_email text := 'thezubairh@gmail.com';
  admin_pass  text := 'imam786123';
  admin_name  text := 'Zubair Hussain';
  uid uuid;
begin
  select id into uid from auth.users where email = admin_email;

  if uid is null then
    uid := gen_random_uuid();

    insert into auth.users (
      instance_id, id, aud, role, email,
      encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at,
      -- GoTrue reads these as text; they MUST be '' (not NULL) or sign-in 500s.
      confirmation_token, recovery_token, email_change,
      email_change_token_new, email_change_token_current,
      phone_change, phone_change_token, reauthentication_token
    ) values (
      '00000000-0000-0000-0000-000000000000',
      uid, 'authenticated', 'authenticated', admin_email,
      crypt(admin_pass, gen_salt('bf')), now(),
      jsonb_build_object('provider', 'email', 'providers', array['email'], 'role', 'admin'),
      jsonb_build_object('display_name', admin_name),
      now(), now(),
      '', '', '', '', '', '', '', ''
    );

    insert into auth.identities (
      id, user_id, identity_data, provider, provider_id,
      last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), uid,
      jsonb_build_object('sub', uid::text, 'email', admin_email, 'email_verified', true),
      'email', admin_email,
      now(), now(), now()
    );

    raise notice 'Admin created: %', admin_email;
  else
    -- Already exists → make sure the password + admin role are correct.
    update auth.users
      set encrypted_password = crypt(admin_pass, gen_salt('bf')),
          email_confirmed_at = coalesce(email_confirmed_at, now()),
          raw_app_meta_data  = coalesce(raw_app_meta_data, '{}'::jsonb)
                                 || jsonb_build_object('role', 'admin'),
          confirmation_token = coalesce(confirmation_token, ''),
          recovery_token = coalesce(recovery_token, ''),
          email_change = coalesce(email_change, ''),
          email_change_token_new = coalesce(email_change_token_new, ''),
          email_change_token_current = coalesce(email_change_token_current, ''),
          phone_change = coalesce(phone_change, ''),
          phone_change_token = coalesce(phone_change_token, ''),
          reauthentication_token = coalesce(reauthentication_token, ''),
          updated_at = now()
      where id = uid;
    raise notice 'Admin updated (role=admin, password reset): %', admin_email;
  end if;
end$$;

-- Done. Sign in at the app with thezubairh@gmail.com / imam786123.
-- To add MEMBERS later, create them the same way but set 'role' to 'member',
-- or use the admin-create-user Edge Function.
