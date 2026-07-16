-- Migration 004: presentation_themes, presentation_theme_likes, favorite_presentation_themes
--
-- Landmine #1: upstream model `PresentationTheme` was @@map("CustomTheme"); this fork
-- queries `presentation_themes`. Code name wins -> physical table `presentation_themes`.
--
-- Landmine #2: snake_case columns confirmed from code: theme_data, logo_url, is_public,
-- is_admin, user_id, created_at, updated_at, name, description.
--
-- Landmine #8: Prisma Json -> jsonb (theme_data); String[] -> text[] (none here).
--
-- Idempotency (unique constraints carry behaviour):
--   @@unique([userId, themeId]) on both like and favourite tables IS the toggle's
--   idempotency. We keep the unique indexes so double-click cannot double-insert.

create table if not exists public.presentation_themes (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  theme_data  jsonb not null,
  logo_url    text,
  is_public   boolean not null default false,
  is_admin    boolean not null default false,
  user_id     uuid references public.users (id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists presentation_themes_user_id_idx on public.presentation_themes (user_id);
create index if not exists presentation_themes_is_public_idx on public.presentation_themes (is_public);
create index if not exists presentation_themes_is_admin_idx on public.presentation_themes (is_admin);

comment on table public.presentation_themes is
  'Custom and system themes. is_public drives public gallery; is_admin marks seeded/system themes.';

-- Like toggle: unique(user_id, theme_id) = idempotent like.
create table if not exists public.presentation_theme_likes (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references public.users (id) on delete cascade,
  theme_id  uuid not null references public.presentation_themes (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, theme_id)
);

create index if not exists presentation_theme_likes_user_id_idx on public.presentation_theme_likes (user_id);
create index if not exists presentation_theme_likes_theme_id_idx on public.presentation_theme_likes (theme_id);

comment on table public.presentation_theme_likes is
  'One row per (user, theme) like. The unique constraint makes the toggle idempotent.';

-- Favourite toggle: unique(user_id, theme_id) = idempotent favourite.
create table if not exists public.favorite_presentation_themes (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references public.users (id) on delete cascade,
  theme_id  uuid not null references public.presentation_themes (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, theme_id)
);

create index if not exists favorite_presentation_themes_user_id_idx on public.favorite_presentation_themes (user_id);
create index if not exists favorite_presentation_themes_theme_id_idx on public.favorite_presentation_themes (theme_id);

comment on table public.favorite_presentation_themes is
  'One row per (user, theme) favourite. The unique constraint makes the toggle idempotent.';
