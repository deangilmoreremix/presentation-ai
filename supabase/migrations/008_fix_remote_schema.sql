-- Migration 008: Fix remote schema mismatch
--
-- The remote database had old Prisma-style tables with PascalCase names and
-- camelCase columns. Those old tables have already been removed. This migration
-- ensures public.users exists and is properly configured.

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

-- Trigger: every auth sign-up auto-creates the matching public.users row.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
