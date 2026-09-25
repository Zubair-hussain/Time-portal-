-- =====================================================================
-- TIME PORTAL — one-click "Register user" (run this ONCE in SQL Editor)
--
-- Creates public.admin_create_user(...). The admin dashboard button calls it
-- via supabase.rpc(). Security:
--   * SECURITY DEFINER so it may write to auth.users on the admin's behalf,
--     but the FIRST thing it does is require is_admin() from the caller's
--     signed JWT — members/anon get an error and nothing is written.
--   * EXECUTE is revoked from public/anon and granted only to authenticated.
--   * No service-role key ever reaches the browser.
-- Requires public.is_admin() from setup.sql.
-- =====================================================================

-- Replace the earlier 4-argument version so PostgREST never sees two overloads.
drop function if exists public.admin_create_user(text, text, text, text);

create or replace function public.admin_create_user(
  p_email text,
  p_password text,
  p_display_name text,
  p_role text default 'member',
  -- true  = create UNCONFIRMED: the user cannot sign in until they click the
  --         confirmation email the app then sends (proves they own the inbox).
  -- false = create pre-confirmed (no email needed).
  p_require_confirmation boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions, auth
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_role  text := case when p_role = 'admin' then 'admin' else 'member' end;
  v_name  text := trim(coalesce(p_display_name, ''));
  uid uuid := gen_random_uuid();
begin
  if not public.is_admin() then
    raise exception 'Only admins can create users' using errcode = '42501';
  end if;

  -- Server-side email checks (the UI also verifies, but this cannot be bypassed).
  if length(v_email) > 254
     or split_part(v_email, '@', 1) = ''
     or length(split_part(v_email, '@', 1)) > 64
     or v_email !~ '^[a-z0-9!#$%&''*+/=?^_`{|}~-]+(\.[a-z0-9!#$%&''*+/=?^_`{|}~-]+)*@([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$'
  then
    raise exception 'Invalid email address';
  end if;

  if split_part(v_email, '@', 2) in (
    'mailinator.com', 'guerrillamail.com', '10minutemail.com', 'tempmail.com',
    'temp-mail.org', 'yopmail.com', 'trashmail.com', 'sharklasers.com',
    'getnada.com', 'throwawaymail.com'
  ) then
    raise exception 'Disposable email addresses are not allowed';
  end if;

  if length(coalesce(p_password, '')) < 8 then
    raise exception 'Password must be at least 8 characters';
  end if;

  if exists (select 1 from auth.users where email = v_email) then
    raise exception 'A user with this email already exists';
  end if;

  insert into auth.users (
    instance_id, id, aud, role, email,
    encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change,
    email_change_token_new, email_change_token_current,
    phone_change, phone_change_token, reauthentication_token
  ) values (
    '00000000-0000-0000-0000-000000000000',
    uid, 'authenticated', 'authenticated', v_email,
    crypt(p_password, gen_salt('bf')),
    case when p_require_confirmation then null else now() end,
    jsonb_build_object('provider', 'email', 'providers', array['email'], 'role', v_role),
    jsonb_build_object('display_name', v_name),
    now(), now(),
    '', '', '', '', '', '', '', ''
  );

  insert into auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(), uid,
    jsonb_build_object('sub', uid::text, 'email', v_email, 'email_verified', not p_require_confirmation),
    'email', v_email, now(), now(), now()
  );

  return uid;
end;
$$;

revoke all on function public.admin_create_user(text, text, text, text, boolean) from public, anon;
grant execute on function public.admin_create_user(text, text, text, text, boolean) to authenticated;

-- ---------------------------------------------------------------------
-- admin_list_users(): lets the admin console show real names/emails and who
-- has confirmed their email. Same guard: admin JWT required, nobody else.
-- ---------------------------------------------------------------------
create or replace function public.admin_list_users()
returns table (
  id uuid,
  email text,
  display_name text,
  role text,
  email_confirmed boolean,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can list users' using errcode = '42501';
  end if;

  return query
    select u.id,
           u.email::text,
           coalesce(u.raw_user_meta_data ->> 'display_name', '')::text,
           coalesce(u.raw_app_meta_data ->> 'role', 'member')::text,
           u.email_confirmed_at is not null,
           u.created_at
    from auth.users u
    order by u.created_at desc;
end;
$$;

revoke all on function public.admin_list_users() from public, anon;
grant execute on function public.admin_list_users() to authenticated;

-- Make the API pick up the new function immediately.
notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------
-- OPTIONAL FIX: sign-in lowercases the email, so any user created earlier with
-- capital letters (e.g. "Zh@gmail.com") cannot log in. Normalise them:
-- ---------------------------------------------------------------------
update auth.users set email = lower(email) where email <> lower(email);
update auth.identities
  set provider_id = lower(provider_id),
      identity_data = jsonb_set(identity_data, '{email}', to_jsonb(lower(identity_data->>'email')))
  where provider = 'email' and provider_id <> lower(provider_id);
