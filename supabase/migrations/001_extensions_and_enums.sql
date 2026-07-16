-- Migration 001: extensions and enums
-- Source of truth: recovered upstream Prisma schema (prisma/schema.prisma) for
-- semantics, and the running fork code for names/values.
--
-- Enums (landmine #8): upstream UserRole and DocumentType become native Postgres
-- enums. Values preserved exactly.

create extension if not exists "pgcrypto";

-- UserRole: ADMIN, USER  (upstream enum UserRole)
do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type user_role as enum ('ADMIN', 'USER');
  end if;
end$$;

-- DocumentType: all nine upstream values, preserved verbatim.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'document_type') then
    create type document_type as enum (
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
