-- =====================================================================
-- Time Portal — Supabase schema + Row Level Security (RLS)
-- Run in the Supabase SQL editor, or via `supabase db push`.
-- =====================================================================

-- ---- Entry status enum -------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'entry_status') then
    create type entry_status as enum ('pending', 'approved', 'rejected');
  end if;
end$$;

-- ---- time_entries table ------------------------------------------------
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

-- ---- Helper: is the current JWT an admin? ------------------------------
-- Reads the verified claim set via auth.jwt(). app_metadata.role is set by an
-- admin through the service role and is NOT user-editable.
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
    false
  );
$$;

-- ---- Enable RLS --------------------------------------------------------
alter table public.time_entries enable row level security;

-- Members can read their own entries; admins can read all.
drop policy if exists "read own or admin" on public.time_entries;
create policy "read own or admin" on public.time_entries
  for select using (user_id = auth.uid() or public.is_admin());

-- Members can insert only rows for themselves.
drop policy if exists "insert own" on public.time_entries;
create policy "insert own" on public.time_entries
  for insert with check (user_id = auth.uid());

-- Members can update their own rows BUT cannot change status (only admins review).
drop policy if exists "update own not status" on public.time_entries;
create policy "update own not status" on public.time_entries
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Admins can update any row (including status transitions).
drop policy if exists "admin update all" on public.time_entries;
create policy "admin update all" on public.time_entries
  for update using (public.is_admin()) with check (public.is_admin());

-- Only admins may delete.
drop policy if exists "admin delete" on public.time_entries;
create policy "admin delete" on public.time_entries
  for delete using (public.is_admin());

-- ---- Guard: prevent members from self-approving via a trigger ----------
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
