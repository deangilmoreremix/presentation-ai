-- Migration 005: favorite_documents, font_pairs, generated_images
--
-- Landmine #2: snake_case columns (confirmed from code).
-- Landmine #8: String[] -> text[] (outline in presentations already handled);
--   here generated_images has fork-added nullable columns selected via select("*").

-- Favourite documents: unique(user_id, document_id) = idempotent document favourite.
-- Upstream FavoriteDocument.id was uuid(); code needs a stable PK for delete-by-id.
create table if not exists public.favorite_documents (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users (id) on delete cascade,
  document_id uuid not null references public.base_documents (id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (user_id, document_id)
);

create index if not exists favorite_documents_user_id_idx on public.favorite_documents (user_id);
create index if not exists favorite_documents_document_id_idx on public.favorite_documents (document_id);

comment on table public.favorite_documents is
  'Starred documents. unique(user_id, document_id) makes the toggle idempotent.';

-- Font pairs. Upstream heading_weight @default(700), body_weight @default(400);
-- we keep those defaults since they are safe semantics and the code inserts them explicitly.
create table if not exists public.font_pairs (
  id            uuid primary key default gen_random_uuid(),
  heading       text not null,
  heading_url   text,
  heading_weight integer not null default 700,
  body          text not null,
  body_url      text,
  body_weight   integer not null default 400,
  user_id       uuid not null references public.users (id) on delete cascade,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists font_pairs_user_id_idx on public.font_pairs (user_id);

comment on table public.font_pairs is 'User-saved font pairings for presentations.';

-- Generated images. Upstream GeneratedImage had only id, url, createdAt, updatedAt,
-- userId, prompt. This fork added nullable metadata columns (model, size, quality,
-- format, compression, background, action, previous_response_id) read via select("*")
-- in fetch.ts. They are nullable because no insert path populates them yet.
create table if not exists public.generated_images (
  id                   uuid primary key default gen_random_uuid(),
  url                  text not null,
  prompt              text not null,
  user_id             uuid not null references public.users (id) on delete cascade,
  model               text,
  size                text,
  quality             text,
  format              text,
  compression         integer,
  background          text,
  action              text,
  previous_response_id text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists generated_images_user_id_idx on public.generated_images (user_id);

comment on table public.generated_images is 'AI-generated images persisted per user.';
