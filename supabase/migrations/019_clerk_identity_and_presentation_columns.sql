-- Migration 019: Clerk-keyed identity + align `presentations` with the app's write path
--
-- Why this migration exists
-- -------------------------
-- The app authenticates with Clerk, so a user identifier is a Clerk id
-- (`user_2abc...`), not a uuid. Migrations 001-018 are recorded in
-- `app_migration_metadata`, but the identity columns are still `uuid` with a
-- foreign key to `auth.users(id)`. Consequences before this migration:
--
--   * `POST /api/webhooks/clerk` upserts `id: <clerk id>` into `users.id` and
--     fails with `invalid input syntax for type uuid`;
--   * every write that carries `user_id = <clerk id>` (base_documents,
--     presentation_themes, font_pairs, generated_images, ...) fails on the
--     column type or the FK, so a signed-in user cannot create a presentation.
--
-- This migration makes the database match the auth model:
--
--   1. adds `users.clerk_id` (text) and drops the `auth.users` FK;
--   2. converts the seven identity columns from `uuid` to `text`, re-pointing
--      their FKs at `users(clerk_id)`;
--   3. adds the columns the app writes that were never actually created
--      (migrations 012, 015, 018);
--   4. replaces the `auth.uid()` RLS policies, which can never succeed under a
--      Clerk-only auth model, with a service-role-only posture.
--
-- Backwards compatibility
-- -----------------------
-- `presentations` is referenced by `slides.presentation` and
-- `chat_history_messages.presentation_id`, so its legacy columns are kept
-- in place and only relaxed/extended. All three tables were empty when this
-- migration was authored, so no existing rows are rewritten.

begin;

-- ---------------------------------------------------------------------------
-- 1. Clerk-keyed users
-- ---------------------------------------------------------------------------

alter table public.users add column if not exists clerk_id text;

-- The live table lost the `default gen_random_uuid()` that migration 002
-- declares, so webhook upserts that omit `id` fail on the NOT NULL constraint.
alter table public.users alter column id set default gen_random_uuid();

-- Existing rows keep their identity as text so their child rows stay valid.
update public.users set clerk_id = id::text where clerk_id is null;

alter table public.users alter column clerk_id set not null;
create unique index if not exists users_clerk_id_key on public.users (clerk_id);

-- Clerk is the identity provider; this FK can never be satisfied by a Clerk id.
alter table public.users drop constraint if exists users_id_fkey;

-- A legacy UNIQUE(email) makes the Clerk webhook upsert fail whenever an email
-- is already present on another row (e.g. the seeded anonymous@local row).
-- clerk_id is the identity, so email only needs to be an ordinary column.
alter table public.users drop constraint if exists users_email_key;

-- Migration 012 was recorded as applied but the columns were never created.
alter table public.users add column if not exists openai_api_key_encrypted text;
alter table public.users add column if not exists openai_api_key_iv text;

comment on column public.users.clerk_id is
  'Clerk user id (user_xxx). The identity used by every user_id column in this schema.';

-- ---------------------------------------------------------------------------
-- 2. Drop the auth.uid()-based RLS policies
-- ---------------------------------------------------------------------------
--
-- These must be dropped before step 3: Postgres refuses to change the type of
-- a column that a policy expression depends on.
--
-- Every policy compared `auth.uid()` (a Supabase Auth uuid) against a user_id
-- column. This app never creates a Supabase Auth session -- Clerk is the only
-- identity provider -- so `auth.uid()` is always null and these policies could
-- only ever deny. After the uuid -> text conversion they would additionally
-- raise `operator does not exist: uuid = text` at evaluation time.
--
-- Access is via the service-role key, which bypasses RLS. Enabling RLS with no
-- policies (step 4) therefore leaves the anon/authenticated roles with no
-- access rather than leaving the tables half-exposed.

drop policy if exists users_select_self on public.users;
drop policy if exists users_update_self on public.users;

drop policy if exists presentation_themes_select on public.presentation_themes;
drop policy if exists presentation_themes_insert on public.presentation_themes;
drop policy if exists presentation_themes_update on public.presentation_themes;
drop policy if exists presentation_themes_delete on public.presentation_themes;

drop policy if exists presentation_theme_likes_select on public.presentation_theme_likes;
drop policy if exists presentation_theme_likes_insert on public.presentation_theme_likes;
drop policy if exists presentation_theme_likes_delete on public.presentation_theme_likes;

drop policy if exists favorite_presentation_themes_select on public.favorite_presentation_themes;
drop policy if exists favorite_presentation_themes_insert on public.favorite_presentation_themes;
drop policy if exists favorite_presentation_themes_delete on public.favorite_presentation_themes;

drop policy if exists favorite_documents_select on public.favorite_documents;
drop policy if exists favorite_documents_insert on public.favorite_documents;
drop policy if exists favorite_documents_delete on public.favorite_documents;

drop policy if exists font_pairs_select on public.font_pairs;
drop policy if exists font_pairs_insert on public.font_pairs;
drop policy if exists font_pairs_update on public.font_pairs;
drop policy if exists font_pairs_delete on public.font_pairs;

drop policy if exists generated_images_select on public.generated_images;
drop policy if exists generated_images_insert on public.generated_images;
drop policy if exists generated_images_update on public.generated_images;
drop policy if exists generated_images_delete on public.generated_images;

-- ---------------------------------------------------------------------------
-- 3. Identity columns: uuid -> text, FKs repointed at users(clerk_id)
-- ---------------------------------------------------------------------------
--
-- `users.clerk_id` was backfilled from `id::text` above, so converting a
-- `user_id` column with `using user_id::text` preserves existing references.

alter table public.base_documents drop constraint if exists base_documents_user_id_fkey;
alter table public.base_documents alter column user_id type text using user_id::text;
alter table public.base_documents add constraint base_documents_user_id_fkey
  foreign key (user_id) references public.users (clerk_id) on delete cascade;

alter table public.presentation_themes drop constraint if exists presentation_themes_user_id_fkey;
alter table public.presentation_themes alter column user_id type text using user_id::text;
alter table public.presentation_themes add constraint presentation_themes_user_id_fkey
  foreign key (user_id) references public.users (clerk_id) on delete cascade;

alter table public.presentation_theme_likes drop constraint if exists presentation_theme_likes_user_id_fkey;
alter table public.presentation_theme_likes alter column user_id type text using user_id::text;
alter table public.presentation_theme_likes add constraint presentation_theme_likes_user_id_fkey
  foreign key (user_id) references public.users (clerk_id) on delete cascade;

alter table public.favorite_presentation_themes drop constraint if exists favorite_presentation_themes_user_id_fkey;
alter table public.favorite_presentation_themes alter column user_id type text using user_id::text;
alter table public.favorite_presentation_themes add constraint favorite_presentation_themes_user_id_fkey
  foreign key (user_id) references public.users (clerk_id) on delete cascade;

alter table public.favorite_documents drop constraint if exists favorite_documents_user_id_fkey;
alter table public.favorite_documents alter column user_id type text using user_id::text;
alter table public.favorite_documents add constraint favorite_documents_user_id_fkey
  foreign key (user_id) references public.users (clerk_id) on delete cascade;

alter table public.font_pairs drop constraint if exists font_pairs_user_id_fkey;
alter table public.font_pairs alter column user_id type text using user_id::text;
alter table public.font_pairs add constraint font_pairs_user_id_fkey
  foreign key (user_id) references public.users (clerk_id) on delete cascade;

alter table public.generated_images drop constraint if exists generated_images_user_id_fkey;
alter table public.generated_images alter column user_id type text using user_id::text;
alter table public.generated_images add constraint generated_images_user_id_fkey
  foreign key (user_id) references public.users (clerk_id) on delete cascade;

-- ---------------------------------------------------------------------------
-- 4. presentations: extend, do not reshape
-- ---------------------------------------------------------------------------
--
-- The live table predates this fork and carries a legacy column set. It is
-- referenced by `slides` and `chat_history_messages`, so every legacy column is
-- preserved. Only constraints the app cannot satisfy are relaxed.

alter table public.presentations alter column id set default gen_random_uuid();
alter table public.presentations alter column content type jsonb using content::jsonb;
alter table public.presentations alter column created_at set default now();
alter table public.presentations alter column updated_at set default now();

-- NOT NULL columns with no default that this app never populates.
-- `version` keeps its legacy CHECK (v1-standard | v2-standard); NULL satisfies a
-- CHECK, so the row is accepted without inventing a value for it.
alter table public.presentations alter column n_slides set default 0;
alter table public.presentations alter column n_slides drop not null;
alter table public.presentations alter column language drop not null;
alter table public.presentations alter column version drop not null;

-- Columns the app writes (migration 003 + 018) that were never created.
alter table public.presentations add column if not exists document_id uuid;
alter table public.presentations add column if not exists image_source text;
alter table public.presentations add column if not exists presentation_style text;
alter table public.presentations add column if not exists customization jsonb;
alter table public.presentations add column if not exists outline text[];
alter table public.presentations add column if not exists prompt text;
alter table public.presentations add column if not exists search_results jsonb;
alter table public.presentations add column if not exists tool_calls jsonb;
alter table public.presentations add column if not exists selected_chunks jsonb;
alter table public.presentations add column if not exists editor_mode text not null default 'flow';

create unique index if not exists presentations_document_id_key
  on public.presentations (document_id);

alter table public.presentations add constraint presentations_document_id_fkey
  foreign key (document_id) references public.base_documents (id) on delete cascade;

alter table public.presentations drop constraint if exists presentations_editor_mode_check;
alter table public.presentations add constraint presentations_editor_mode_check
  check (editor_mode in ('flow', 'design'));

create index if not exists presentations_document_id_idx
  on public.presentations (document_id);

-- Migration 015: recorded as applied but the table was never created.
create table if not exists public.presentation_messages (
  id              uuid primary key default gen_random_uuid(),
  presentation_id uuid not null references public.base_documents (id) on delete cascade,
  user_id         text not null references public.users (clerk_id) on delete cascade,
  role            text not null check (role in ('user', 'assistant', 'system')),
  parts           jsonb not null,
  created_at      timestamp not null default now()
);

create index if not exists presentation_messages_presentation_id_idx
  on public.presentation_messages (presentation_id, created_at);

create index if not exists presentation_messages_user_id_idx
  on public.presentation_messages (user_id);

-- ---------------------------------------------------------------------------
-- 5. RLS: service-role-only
-- ---------------------------------------------------------------------------
--
-- Enabling RLS with no policies leaves the anon/authenticated roles with no
-- access. The service-role key bypasses RLS, so server-side access is unaffected.

alter table public.users enable row level security;
alter table public.base_documents enable row level security;
alter table public.presentation_themes enable row level security;
alter table public.presentation_theme_likes enable row level security;
alter table public.favorite_presentation_themes enable row level security;
alter table public.favorite_documents enable row level security;
alter table public.font_pairs enable row level security;
alter table public.generated_images enable row level security;
alter table public.presentation_messages enable row level security;

insert into public.app_migration_metadata (version, app_name, description)
values ('019', 'presentation-ai', 'Clerk-keyed identity and presentations columns')
on conflict do nothing;

commit;