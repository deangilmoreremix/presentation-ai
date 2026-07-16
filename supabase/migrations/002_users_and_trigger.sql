-- Migration 002: public.users + trigger that mirrors auth.users
--
-- Landmine #4 (cuid vs uuid): upstream Prisma defined User.id as cuid(), but this
-- fork authenticates through Supabase Auth. getCurrentUser() returns auth.users.id
-- (a uuid) and every user_id FK in the code is compared against that uuid. Therefore
-- public.users.id MUST be a uuid that reconciles with auth.users(id). We override the
-- upstream cuid() semantic here; wrong here = every join silently returns [].
--
-- Landmine #5: Supabase Auth only writes to auth.users. Without a trigger that copies
-- the new row into public.users, no profile row exists and every join finds nothing.
-- This is the most likely root cause of "features look missing" (empty []).

create table if not exists public.users (
  id          uuid primary key references auth.users (id) on delete cascade,
  name        text,
  email       text unique,
  image       text,
  role        user_role not null default 'USER',
  has_access  boolean not null default false,
  headline    text,
  bio         text,
  interests   text[],
  location    text,
  website     text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.users is
  'Application user profile. One row per auth.users row, created by handle_new_user().';

-- Function invoked after a row is inserted into auth.users.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, name, image, role, has_access)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'name',
    new.raw_user_meta_data ->> 'avatar_url',
    'USER',
    false
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Landmine #5 trigger: every auth sign-up auto-creates the matching public.users row.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
