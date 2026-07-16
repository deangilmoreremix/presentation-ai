-- Migration 003: base_documents and presentations (1:1 identity relation)
--
-- Landmine #2: Prisma used PascalCase tables / camelCase columns; this fork uses
-- snake_case for both. Confirmed column names from code: type, document_type,
-- thumbnail_url, user_id, created_at, updated_at, is_public, title.
--
-- Landmine #3: upstream Presentation shared its PK with BaseDocument via
--   base BaseDocument @relation(fields: [id], references: [id], onDelete: Cascade)
-- i.e. id is simultaneously PK and FK (1:1 identity). The fork code names the FK
-- column `document_id` (presentationActions.ts:189, :353) instead of reusing `id`.
-- We reproduce the semantic exactly: presentations.document_id is a UNIQUE FK to
-- base_documents.id with ON DELETE CASCADE, enforcing the 1:1.

create table if not exists public.base_documents (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  type          document_type not null,
  document_type text not null default 'presentation',
  thumbnail_url text,
  user_id       uuid not null references public.users (id) on delete cascade,
  is_public     boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists base_documents_user_id_idx on public.base_documents (user_id);
create index if not exists base_documents_type_idx on public.base_documents (type);

comment on table public.base_documents is
  'Base table for all document-like entities. Presentations, notes, etc. Each may have a 1:1 presentations row.';

create table if not exists public.presentations (
  id                uuid primary key default gen_random_uuid(),
  -- Landmine #3: 1:1 identity relation to base_documents, enforced by UNIQUE + FK.
  document_id       uuid not null unique references public.base_documents (id) on delete cascade,
  content           jsonb,
  theme             text not null default 'mystique',
  image_source      text,
  presentation_style text,
  customization     jsonb,
  language          text,
  outline           text[],
  prompt            text,
  search_results    jsonb,
  tool_calls        jsonb,
  selected_chunks   jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists presentations_document_id_idx on public.presentations (document_id);

comment on table public.presentations is
  'Presentation-specific payload, 1:1 with base_documents via document_id.';
