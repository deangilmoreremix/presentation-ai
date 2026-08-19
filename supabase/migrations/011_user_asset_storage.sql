-- Migration 011: Supabase Storage buckets and RLS policies for user assets.
--
-- Creates two public buckets for user-uploaded assets and row-level
-- security policies ensuring users can only access their own files
-- under the users/{userId}/ prefix.

-- ============================================================================
-- 1. Create storage buckets
-- ============================================================================

insert into storage.buckets (id, name, public)
values
  ('user-assets', 'user-assets', true),
  ('presentation-images', 'presentation-images', true)
on conflict (id) do nothing;

-- ============================================================================
-- 2. Storage policies for user-assets bucket
-- ============================================================================

alter table if exists storage.objects enable row level security;

-- Users can SELECT their own objects in user-assets
drop policy if exists "user_assets_select_own" on storage.objects;
create policy "user_assets_select_own"
  on storage.objects
  for select
  using (
    bucket_id = 'user-assets'
    and auth.uid()::text = (storage.foldername(name))[2]
  );

-- Users can INSERT their own objects in user-assets
drop policy if exists "user_assets_insert_own" on storage.objects;
create policy "user_assets_insert_own"
  on storage.objects
  for insert
  with check (
    bucket_id = 'user-assets'
    and auth.uid()::text = (storage.foldername(name))[2]
  );

-- Users can UPDATE their own objects in user-assets
drop policy if exists "user_assets_update_own" on storage.objects;
create policy "user_assets_update_own"
  on storage.objects
  for update
  using (
    bucket_id = 'user-assets'
    and auth.uid()::text = (storage.foldername(name))[2]
  )
  with check (
    bucket_id = 'user-assets'
    and auth.uid()::text = (storage.foldername(name))[2]
  );

-- Users can DELETE their own objects in user-assets
drop policy if exists "user_assets_delete_own" on storage.objects;
create policy "user_assets_delete_own"
  on storage.objects
  for delete
  using (
    bucket_id = 'user-assets'
    and auth.uid()::text = (storage.foldername(name))[2]
  );

-- ============================================================================
-- 3. Storage policies for presentation-images bucket
-- ============================================================================

-- Users can SELECT their own objects in presentation-images
drop policy if exists "presentation_images_select_own" on storage.objects;
create policy "presentation_images_select_own"
  on storage.objects
  for select
  using (
    bucket_id = 'presentation-images'
    and auth.uid()::text = (storage.foldername(name))[2]
  );

-- Users can INSERT their own objects in presentation-images
drop policy if exists "presentation_images_insert_own" on storage.objects;
create policy "presentation_images_insert_own"
  on storage.objects
  for insert
  with check (
    bucket_id = 'presentation-images'
    and auth.uid()::text = (storage.foldername(name))[2]
  );

-- Users can UPDATE their own objects in presentation-images
drop policy if exists "presentation_images_update_own" on storage.objects;
create policy "presentation_images_update_own"
  on storage.objects
  for update
  using (
    bucket_id = 'presentation-images'
    and auth.uid()::text = (storage.foldername(name))[2]
  )
  with check (
    bucket_id = 'presentation-images'
    and auth.uid()::text = (storage.foldername(name))[2]
  );

-- Users can DELETE their own objects in presentation-images
drop policy if exists "presentation_images_delete_own" on storage.objects;
create policy "presentation_images_delete_own"
  on storage.objects
  for delete
  using (
    bucket_id = 'presentation-images'
    and auth.uid()::text = (storage.foldername(name))[2]
  );
