-- 0001_initial.sql
-- Initial schema for the Supabase-backed application.
-- Replaces the previous Prisma schema. Snake_case column names follow
-- Prisma's default convention. Foreign keys to users reference
-- Supabase's auth.users(id) (Account model is intentionally skipped
-- because Supabase Auth is used instead).
--
-- NOTE: Row Level Security is enabled with permissive policies for
-- local/dev use. These policies MUST be tightened before production.

create extension if not exists "pgcrypto";

-- =========================================================================
-- DocumentType enum (matches Prisma enum: NOTE, DOCUMENT, DRAWING, DESIGN,
-- STICKY_NOTES, MIND_MAP, RESEARCH_PAPER, FLIPBOOK, PRESENTATION)
-- =========================================================================
do $$
begin
  if not exists (select 1 from pg_type where typname = 'DocumentType') then
    create type "DocumentType" as enum (
      'NOTE',
      'DOCUMENT',
      'DRAWING',
      'DESIGN',
      'STICKY_NOTES',
      'MIND_MAP',
      'RESEARCH_PAPER',
      'FLIPBOOK',
      'PRESENTATION'
    );
  end if;
end$$;

-- =========================================================================
-- BaseDocument
-- =========================================================================
create table if not exists "BaseDocument" (
  id            text        primary key default gen_random_uuid()::text,
  title         text        not null,
  type          "DocumentType" not null,
  "userId"      uuid        not null references auth.users(id) on delete cascade,
  "thumbnailUrl" text,
  "createdAt"   timestamptz not null default now(),
  "updatedAt"   timestamptz not null default now(),
  "isPublic"    boolean     not null default false,
  "documentType" text       not null
);

create index if not exists "BaseDocument_userId_idx" on "BaseDocument" ("userId");
create index if not exists "BaseDocument_userId_createdAt_idx"
  on "BaseDocument" ("userId", "createdAt" desc);
create index if not exists "BaseDocument_isPublic_idx" on "BaseDocument" ("isPublic");
create index if not exists "BaseDocument_type_idx" on "BaseDocument" (type);

-- =========================================================================
-- Presentation (1-1 with BaseDocument, keyed by BaseDocument.id)
-- =========================================================================
create table if not exists "Presentation" (
  id                text    primary key references "BaseDocument"(id) on delete cascade,
  content           jsonb   not null,
  theme             text    not null default 'mystique',
  "imageSource"     text    default 'ai',
  prompt            text,
  "presentationStyle" text,
  customization     jsonb,
  language          text    default 'en-US',
  outline           text[]  not null default '{}',
  "searchResults"   jsonb,
  "templateId"      text
);

create index if not exists "Presentation_theme_idx" on "Presentation" (theme);
create index if not exists "Presentation_imageSource_idx" on "Presentation" ("imageSource");
create index if not exists "Presentation_language_idx" on "Presentation" (language);

-- =========================================================================
-- CustomTheme (Prisma model PresentationTheme is mapped to "CustomTheme")
-- =========================================================================
create table if not exists "CustomTheme" (
  id          text        primary key default gen_random_uuid()::text,
  name        text        not null,
  description text,
  "userId"    uuid        not null references auth.users(id) on delete cascade,
  "logoUrl"   text,
  "isPublic"  boolean     not null default false,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  "isAdmin"   boolean     not null default false,
  "themeData" jsonb       not null
);

create index if not exists "CustomTheme_userId_idx" on "CustomTheme" ("userId");

-- =========================================================================
-- FavoritePresentationTheme
-- =========================================================================
create table if not exists "FavoritePresentationTheme" (
  id        text        primary key default gen_random_uuid()::text,
  "userId"  uuid        not null references auth.users(id) on delete cascade,
  "themeId" text        not null references "CustomTheme"(id) on delete cascade,
  "createdAt" timestamptz not null default now(),
  unique ("userId", "themeId")
);

create index if not exists "FavoritePresentationTheme_userId_idx"
  on "FavoritePresentationTheme" ("userId");
create index if not exists "FavoritePresentationTheme_themeId_idx"
  on "FavoritePresentationTheme" ("themeId");

-- =========================================================================
-- PresentationThemeLike
-- =========================================================================
create table if not exists "PresentationThemeLike" (
  id        text        primary key default gen_random_uuid()::text,
  "userId"  uuid        not null references auth.users(id) on delete cascade,
  "themeId" text        not null references "CustomTheme"(id) on delete cascade,
  "createdAt" timestamptz not null default now(),
  unique ("userId", "themeId")
);

create index if not exists "PresentationThemeLike_userId_idx"
  on "PresentationThemeLike" ("userId");
create index if not exists "PresentationThemeLike_themeId_idx"
  on "PresentationThemeLike" ("themeId");

-- =========================================================================
-- FontPair
-- =========================================================================
create table if not exists "FontPair" (
  id            text        primary key default gen_random_uuid()::text,
  heading       text        not null,
  "headingUrl"  text,
  "headingWeight" integer   not null default 700,
  body          text        not null,
  "bodyUrl"     text,
  "bodyWeight"  integer     not null default 400,
  "userId"      uuid        not null references auth.users(id) on delete cascade,
  "createdAt"   timestamptz not null default now(),
  "updatedAt"   timestamptz not null default now()
);

create index if not exists "FontPair_userId_idx" on "FontPair" ("userId");

-- =========================================================================
-- FavoriteDocument
-- =========================================================================
create table if not exists "FavoriteDocument" (
  id          uuid primary key default gen_random_uuid(),
  "documentId" text not null references "BaseDocument"(id) on delete cascade,
  "userId"    uuid not null references auth.users(id) on delete cascade,
  unique ("userId", "documentId")
);

-- =========================================================================
-- GeneratedImage
-- =========================================================================
create table if not exists "GeneratedImage" (
  id          text        primary key default gen_random_uuid()::text,
  url         text        not null,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  "userId"    uuid        not null references auth.users(id) on delete cascade,
  prompt      text        not null,
  model       text,
  size        text,
  quality     text,
  format      text,
  compression integer,
  background  text,
  action      text,
  "previousResponseId" text,
  n           integer,
  "inputImages" text[]    not null default '{}'
);

create index if not exists "GeneratedImage_userId_idx" on "GeneratedImage" ("userId");
create index if not exists "GeneratedImage_model_idx" on "GeneratedImage" (model);
create index if not exists "GeneratedImage_createdAt_idx"
  on "GeneratedImage" ("createdAt" desc);

-- =========================================================================
-- Row Level Security
--
-- WARNING: The policies below are PERMISSIVE for local development. They
-- grant anon and authenticated roles full access to every table. Tighten
-- these policies (typically to "auth.uid() = "userId"") before deploying
-- to production.
-- =========================================================================
alter table "BaseDocument"                enable row level security;
alter table "Presentation"                enable row level security;
alter table "CustomTheme"                 enable row level security;
alter table "FavoritePresentationTheme"   enable row level security;
alter table "PresentationThemeLike"       enable row level security;
alter table "FontPair"                    enable row level security;
alter table "FavoriteDocument"            enable row level security;
alter table "GeneratedImage"              enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array[
    'BaseDocument',
    'Presentation',
    'CustomTheme',
    'FavoritePresentationTheme',
    'PresentationThemeLike',
    'FontPair',
    'FavoriteDocument',
    'GeneratedImage'
  ]
  loop
    execute format('drop policy if exists "dev_all_access" on %I', t);
    execute format(
      'create policy "dev_all_access" on %I for all to anon, authenticated using (true) with check (true)',
      t
    );
  end loop;
end$$;