-- ALLWEONE Presentation — Supabase schema (hand-written, mirrors prisma/schema.prisma)
-- Run with: node scripts/apply-schema.mjs
-- Columns are quoted camelCase to match the Prisma field names the app expects.

CREATE TABLE IF NOT EXISTS public."base_documents" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid(),
  "title" text NOT NULL,
  "type" text,
  "userId" text,
  "thumbnailUrl" text,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  "isPublic" boolean NOT NULL DEFAULT false,
  "documentType" text
);

CREATE TABLE IF NOT EXISTS public."presentations" (
  "id" text PRIMARY KEY,
  "content" jsonb,
  "theme" text NOT NULL DEFAULT 'mystique',
  "imageSource" text DEFAULT 'ai',
  "prompt" text,
  "presentationStyle" text,
  "customization" jsonb,
  "language" text DEFAULT 'en-US',
  "outline" text[],
  "searchResults" jsonb,
  "templateId" text,
  CONSTRAINT "fk_presentation_base" FOREIGN KEY ("id") REFERENCES public."base_documents" ("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public."presentation_themes" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "description" text,
  "userId" text,
  "logoUrl" text,
  "isPublic" boolean NOT NULL DEFAULT false,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  "isAdmin" boolean NOT NULL DEFAULT false,
  "themeData" jsonb
);

CREATE TABLE IF NOT EXISTS public."presentation_theme_likes" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" text,
  "themeId" text,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "fk_like_theme" FOREIGN KEY ("themeId") REFERENCES public."presentation_themes" ("id") ON DELETE CASCADE,
  CONSTRAINT "uq_like_user_theme" UNIQUE ("userId", "themeId")
);

CREATE TABLE IF NOT EXISTS public."favorite_presentation_themes" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" text,
  "themeId" text,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "fk_fav_theme" FOREIGN KEY ("themeId") REFERENCES public."presentation_themes" ("id") ON DELETE CASCADE,
  CONSTRAINT "uq_fav_user_theme" UNIQUE ("userId", "themeId")
);

CREATE TABLE IF NOT EXISTS public."font_pairs" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid(),
  "heading" text NOT NULL,
  "headingUrl" text,
  "headingWeight" integer NOT NULL DEFAULT 700,
  "body" text NOT NULL,
  "bodyUrl" text,
  "bodyWeight" integer NOT NULL DEFAULT 400,
  "userId" text,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."generated_images" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid(),
  "url" text NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  "userId" text,
  "prompt" text NOT NULL,
  "model" text,
  "size" text,
  "quality" text,
  "format" text,
  "compression" integer,
  "background" text,
  "action" text,
  "previousResponseId" text,
  "n" integer,
  "inputImages" text[]
);

CREATE TABLE IF NOT EXISTS public."favorite_documents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "documentId" text,
  "userId" text,
  CONSTRAINT "fk_favdoc_doc" FOREIGN KEY ("documentId") REFERENCES public."base_documents" ("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public."users" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text,
  "email" text UNIQUE,
  "password" text,
  "emailVerified" timestamptz,
  "image" text,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  "headline" text,
  "bio" text,
  "interests" text[],
  "location" text,
  "website" text,
  "role" text DEFAULT 'USER',
  "hasAccess" boolean NOT NULL DEFAULT false,
  "openaiApiKeyEncrypted" text,
  "openaiApiKeyIv" text
);

CREATE INDEX IF NOT EXISTS "idx_base_documents_userId" ON public."base_documents" ("userId");
CREATE INDEX IF NOT EXISTS "idx_base_documents_user_created" ON public."base_documents" ("userId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_base_documents_isPublic" ON public."base_documents" ("isPublic");
CREATE INDEX IF NOT EXISTS "idx_base_documents_type" ON public."base_documents" ("type");
CREATE INDEX IF NOT EXISTS "idx_presentations_theme" ON public."presentations" ("theme");
CREATE INDEX IF NOT EXISTS "idx_presentations_imageSource" ON public."presentations" ("imageSource");
CREATE INDEX IF NOT EXISTS "idx_presentations_language" ON public."presentations" ("language");
CREATE INDEX IF NOT EXISTS "idx_theme_likes_themeId" ON public."presentation_theme_likes" ("themeId");
CREATE INDEX IF NOT EXISTS "idx_fav_themes_themeId" ON public."favorite_presentation_themes" ("themeId");

-- Refresh PostgREST schema cache so the Supabase JS client sees the new tables.
SELECT pg_notify('pgrst', 'reload schema');
