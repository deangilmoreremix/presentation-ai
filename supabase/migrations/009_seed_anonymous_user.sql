-- Migration 009: Seed a fixed anonymous user.
--
-- Authentication is not required to use any feature of the app. When there is
-- no signed-in session, the server acts as this shared anonymous user. Because
-- every user_id column has a foreign key to public.users(id) -> auth.users(id),
-- we must seed a real row in both tables so anonymous writes satisfy the FK.
--
-- The anonymous user id is fixed: 00000000-0000-0000-0000-000000000000
-- (kept in sync with ANONYMOUS_USER_ID in src/lib/supabase/server.ts).

-- 1. Insert into auth.users. The on_auth_user_created trigger (migration 008)
--    will create the matching public.users row. We provide the columns auth
--    requires; unspecified columns use their defaults.
insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
)
values (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'anonymous@local',
  '',
  now(),
  now(),
  now(),
  '{"provider":"anonymous","providers":["anonymous"]}'::jsonb,
  '{"name":"Anonymous"}'::jsonb,
  false,
  '',
  '',
  '',
  ''
)
on conflict (id) do nothing;

-- 2. Ensure the public.users row exists even if the trigger did not fire
--    (e.g. trigger not installed in this environment). Grant access + admin so
--    every gated feature works for the shared anonymous user.
insert into public.users (id, email, name, role, has_access)
values (
  '00000000-0000-0000-0000-000000000000',
  'anonymous@local',
  'Anonymous',
  'ADMIN',
  true
)
on conflict (id) do update
  set role = 'ADMIN',
      has_access = true;
