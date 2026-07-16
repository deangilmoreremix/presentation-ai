-- Migration 007: Row Level Security policies for all nine tables.
--
-- RLS is the main event. Supabase enables RLS by default and returns [] with NO error
-- when no policy matches. A table with RLS on and zero policies ALWAYS looks empty -
-- this is the most likely reason features appeared missing.
--
-- Rules are derived from the actual server actions, not guesses:
--   * Owner-scoped on user_id in general; auth.uid() is the predicate.
--   * presentation_themes: is_public/is_admin -> public readable by all, writable only by owner.
--   * base_documents.is_public drives public sharing (see src/server/share/authorization.ts:
--     canReadDocument => is_public OR owner). Anonymous visitors may READ public docs.
--   * All actions run as the signed-in user (cookie session / anon key). No service-role
--     context is used for data queries (src/lib/supabase/server.ts prefers service role
--     only as a fallback key, but RLS still applies to the authenticated role). Therefore
--     every policy keyed on auth.uid() is correct.

-- ============================================================================
-- 1. users
-- ============================================================================
alter table public.users enable row level security;

-- Users can read their own profile.
drop policy if exists users_select_self on public.users;
create policy users_select_self on public.users
  for select using (auth.uid() = id);

-- Users can update their own profile.
drop policy if exists users_update_self on public.users;
create policy users_update_self on public.users
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Profiles are created by the handle_new_user() SECURITY DEFINER trigger (auth context),
-- not by client inserts, so no INSERT policy for anon/authenticated is required.
-- (If direct inserts are ever desired, add a WITH CHECK (auth.uid() = id) policy.)

-- ============================================================================
-- 2. base_documents
-- ============================================================================
alter table public.base_documents enable row level security;

-- Owner can read their own documents.
drop policy if exists base_documents_select_owner on public.base_documents;
create policy base_documents_select_owner on public.base_documents
  for select using (auth.uid() = user_id);

-- Anyone (including anonymous visitors) can read PUBLIC documents. This powers the
-- shared-presentation view (getSharedPresentation) and public sharing.
drop policy if exists base_documents_select_public on public.base_documents;
create policy base_documents_select_public on public.base_documents
  for select using (is_public = true);

-- Owner can insert their own documents.
drop policy if exists base_documents_insert_owner on public.base_documents;
create policy base_documents_insert_owner on public.base_documents
  for insert with check (auth.uid() = user_id);

-- Owner can update their own documents.
drop policy if exists base_documents_update_owner on public.base_documents;
create policy base_documents_update_owner on public.base_documents
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Owner can delete their own documents.
drop policy if exists base_documents_delete_owner on public.base_documents;
create policy base_documents_delete_owner on public.base_documents
  for delete using (auth.uid() = user_id);

-- ============================================================================
-- 3. presentations  (1:1 with base_documents via document_id)
-- ============================================================================
alter table public.presentations enable row level security;

-- Readable when the parent base_document is owned by the user OR is public.
drop policy if exists presentations_select on public.presentations;
create policy presentations_select on public.presentations
  for select using (
    exists (
      select 1 from public.base_documents bd
      where bd.id = presentations.document_id
        and (bd.user_id = auth.uid() or bd.is_public = true)
    )
  );

-- Insertable when the parent base_document is owned by the user.
drop policy if exists presentations_insert on public.presentations;
create policy presentations_insert on public.presentations
  for insert with check (
    exists (
      select 1 from public.base_documents bd
      where bd.id = presentations.document_id
        and bd.user_id = auth.uid()
    )
  );

-- Updatable when the parent base_document is owned by the user.
drop policy if exists presentations_update on public.presentations;
create policy presentations_update on public.presentations
  for update using (
    exists (
      select 1 from public.base_documents bd
      where bd.id = presentations.document_id
        and bd.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.base_documents bd
      where bd.id = presentations.document_id
        and bd.user_id = auth.uid()
    )
  );

-- Deletable when the parent base_document is owned by the user.
drop policy if exists presentations_delete on public.presentations;
create policy presentations_delete on public.presentations
  for delete using (
    exists (
      select 1 from public.base_documents bd
      where bd.id = presentations.document_id
        and bd.user_id = auth.uid()
    )
  );

-- ============================================================================
-- 4. presentation_themes
-- ============================================================================
alter table public.presentation_themes enable row level security;

-- Public themes (and system/admin themes, is_admin=true) are readable by anyone.
-- Private themes are readable only by their owner.
drop policy if exists presentation_themes_select on public.presentation_themes;
create policy presentation_themes_select on public.presentation_themes
  for select using (is_public = true or is_admin = true or auth.uid() = user_id);

-- Only the owner can insert their own theme. (System themes are seeded via migration
-- or admin path with elevated privileges, not by clients.)
drop policy if exists presentation_themes_insert on public.presentation_themes;
create policy presentation_themes_insert on public.presentation_themes
  for insert with check (auth.uid() = user_id);

-- Only the owner can update their own theme.
drop policy if exists presentation_themes_update on public.presentation_themes;
create policy presentation_themes_update on public.presentation_themes
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Only the owner can delete their own theme.
drop policy if exists presentation_themes_delete on public.presentation_themes;
create policy presentation_themes_delete on public.presentation_themes
  for delete using (auth.uid() = user_id);

-- ============================================================================
-- 5. presentation_theme_likes
-- ============================================================================
alter table public.presentation_theme_likes enable row level security;

-- A user can see likes they created (needed for "isLiked" flags).
drop policy if exists presentation_theme_likes_select on public.presentation_theme_likes;
create policy presentation_theme_likes_select on public.presentation_theme_likes
  for select using (auth.uid() = user_id);

-- A user can only like on their own behalf.
drop policy if exists presentation_theme_likes_insert on public.presentation_theme_likes;
create policy presentation_theme_likes_insert on public.presentation_theme_likes
  for insert with check (auth.uid() = user_id);

-- A user can only remove their own like.
drop policy if exists presentation_theme_likes_delete on public.presentation_theme_likes;
create policy presentation_theme_likes_delete on public.presentation_theme_likes
  for delete using (auth.uid() = user_id);

-- ============================================================================
-- 6. favorite_presentation_themes
-- ============================================================================
alter table public.favorite_presentation_themes enable row level security;

drop policy if exists favorite_presentation_themes_select on public.favorite_presentation_themes;
create policy favorite_presentation_themes_select on public.favorite_presentation_themes
  for select using (auth.uid() = user_id);

drop policy if exists favorite_presentation_themes_insert on public.favorite_presentation_themes;
create policy favorite_presentation_themes_insert on public.favorite_presentation_themes
  for insert with check (auth.uid() = user_id);

drop policy if exists favorite_presentation_themes_delete on public.favorite_presentation_themes;
create policy favorite_presentation_themes_delete on public.favorite_presentation_themes
  for delete using (auth.uid() = user_id);

-- ============================================================================
-- 7. favorite_documents
-- ============================================================================
alter table public.favorite_documents enable row level security;

drop policy if exists favorite_documents_select on public.favorite_documents;
create policy favorite_documents_select on public.favorite_documents
  for select using (auth.uid() = user_id);

drop policy if exists favorite_documents_insert on public.favorite_documents;
create policy favorite_documents_insert on public.favorite_documents
  for insert with check (auth.uid() = user_id);

drop policy if exists favorite_documents_delete on public.favorite_documents;
create policy favorite_documents_delete on public.favorite_documents
  for delete using (auth.uid() = user_id);

-- ============================================================================
-- 8. font_pairs
-- ============================================================================
alter table public.font_pairs enable row level security;

drop policy if exists font_pairs_select on public.font_pairs;
create policy font_pairs_select on public.font_pairs
  for select using (auth.uid() = user_id);

drop policy if exists font_pairs_insert on public.font_pairs;
create policy font_pairs_insert on public.font_pairs
  for insert with check (auth.uid() = user_id);

drop policy if exists font_pairs_update on public.font_pairs;
create policy font_pairs_update on public.font_pairs
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists font_pairs_delete on public.font_pairs;
create policy font_pairs_delete on public.font_pairs
  for delete using (auth.uid() = user_id);

-- ============================================================================
-- 9. generated_images
-- ============================================================================
alter table public.generated_images enable row level security;

drop policy if exists generated_images_select on public.generated_images;
create policy generated_images_select on public.generated_images
  for select using (auth.uid() = user_id);

drop policy if exists generated_images_insert on public.generated_images;
create policy generated_images_insert on public.generated_images
  for insert with check (auth.uid() = user_id);

drop policy if exists generated_images_update on public.generated_images;
create policy generated_images_update on public.generated_images
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists generated_images_delete on public.generated_images;
create policy generated_images_delete on public.generated_images
  for delete using (auth.uid() = user_id);
