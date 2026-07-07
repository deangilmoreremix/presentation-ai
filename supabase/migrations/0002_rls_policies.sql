-- 0002_rls_policies.sql
-- Purpose: Forward-compatible Row Level Security safety net for the ALLWEONE
-- presentation app. All app DB access currently happens server-side via the
-- Supabase service-role key, which BYPASSES RLS automatically. Enabling RLS
-- therefore does NOT affect the running app. These policies are designed so
-- that once real Supabase Auth (auth.uid()) is introduced, owners keep access
-- to their own rows and the public can read public content. Anonymous access
-- remains possible via the anon/authenticated roles for public content.
--
-- Idempotency: CREATE POLICY has no IF NOT EXISTS on this server, so every
-- policy is first DROP POLICY IF EXISTS, then CREATE POLICY. ALTER TABLE ...
-- ENABLE ROW LEVEL SECURITY is itself idempotent and is applied last.
-- We intentionally add NO policies targeting service_role (it bypasses RLS).

-- ---------------------------------------------------------------------------
-- base_documents
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "base_documents_public_read" ON public."base_documents";
CREATE POLICY "base_documents_public_read"
  ON public."base_documents"
  FOR SELECT
  TO anon, authenticated
  USING ("isPublic" = true);

DROP POLICY IF EXISTS "base_documents_owner_all" ON public."base_documents";
CREATE POLICY "base_documents_owner_all"
  ON public."base_documents"
  FOR ALL
  TO authenticated
  USING (auth.uid()::text = "userId")
  WITH CHECK (auth.uid()::text = "userId");

-- ---------------------------------------------------------------------------
-- presentations (owner derived from the parent base_documents row)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "presentations_owner_all" ON public."presentations";
CREATE POLICY "presentations_owner_all"
  ON public."presentations"
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public."base_documents" b
    WHERE b."id" = "presentations"."id" AND b."userId" = auth.uid()::text
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public."base_documents" b
    WHERE b."id" = "presentations"."id" AND b."userId" = auth.uid()::text
  ));

-- ---------------------------------------------------------------------------
-- presentation_themes
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "presentation_themes_public_read" ON public."presentation_themes";
CREATE POLICY "presentation_themes_public_read"
  ON public."presentation_themes"
  FOR SELECT
  TO anon, authenticated
  USING ("isPublic" = true);

DROP POLICY IF EXISTS "presentation_themes_owner_all" ON public."presentation_themes";
CREATE POLICY "presentation_themes_owner_all"
  ON public."presentation_themes"
  FOR ALL
  TO authenticated
  USING (auth.uid()::text = "userId")
  WITH CHECK (auth.uid()::text = "userId");

-- ---------------------------------------------------------------------------
-- presentation_theme_likes
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "presentation_theme_likes_owner_all" ON public."presentation_theme_likes";
CREATE POLICY "presentation_theme_likes_owner_all"
  ON public."presentation_theme_likes"
  FOR ALL
  TO authenticated
  USING (auth.uid()::text = "userId")
  WITH CHECK (auth.uid()::text = "userId");

-- ---------------------------------------------------------------------------
-- favorite_presentation_themes
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "favorite_presentation_themes_owner_all" ON public."favorite_presentation_themes";
CREATE POLICY "favorite_presentation_themes_owner_all"
  ON public."favorite_presentation_themes"
  FOR ALL
  TO authenticated
  USING (auth.uid()::text = "userId")
  WITH CHECK (auth.uid()::text = "userId");

-- ---------------------------------------------------------------------------
-- font_pairs
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "font_pairs_owner_all" ON public."font_pairs";
CREATE POLICY "font_pairs_owner_all"
  ON public."font_pairs"
  FOR ALL
  TO authenticated
  USING (auth.uid()::text = "userId")
  WITH CHECK (auth.uid()::text = "userId");

-- ---------------------------------------------------------------------------
-- generated_images
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "generated_images_owner_all" ON public."generated_images";
CREATE POLICY "generated_images_owner_all"
  ON public."generated_images"
  FOR ALL
  TO authenticated
  USING (auth.uid()::text = "userId")
  WITH CHECK (auth.uid()::text = "userId");

-- ---------------------------------------------------------------------------
-- favorite_documents
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "favorite_documents_owner_all" ON public."favorite_documents";
CREATE POLICY "favorite_documents_owner_all"
  ON public."favorite_documents"
  FOR ALL
  TO authenticated
  USING (auth.uid()::text = "userId")
  WITH CHECK (auth.uid()::text = "userId");

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "users_owner_select" ON public."users";
CREATE POLICY "users_owner_select"
  ON public."users"
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = "id");

DROP POLICY IF EXISTS "users_owner_update" ON public."users";
CREATE POLICY "users_owner_update"
  ON public."users"
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = "id")
  WITH CHECK (auth.uid()::text = "id");

-- ---------------------------------------------------------------------------
-- Enable RLS on every table (idempotent)
-- ---------------------------------------------------------------------------
ALTER TABLE public."base_documents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."presentations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."presentation_themes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."presentation_theme_likes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."favorite_presentation_themes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."font_pairs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."generated_images" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."favorite_documents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."users" ENABLE ROW LEVEL SECURITY;
