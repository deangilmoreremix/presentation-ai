# Schema Reference — `presentation-ai` (Supabase)

This document is the human-readable companion to the versioned SQL migrations in
`supabase/migrations/` and the committed dump `supabase/schema.sql`. It maps each of the
nine tables the application queries to the server actions / features that use it, the
exact columns the code contracts on, and the RLS policy that protects it.

> **Identity rule (landmine #4):** `public.users.id` is a **`uuid`** that reconciles with
> `auth.users(id)`. Every `user_id` (and every `theme_id` / `document_id`) foreign key is a
> `uuid`. This overrides the upstream Prisma `cuid()` because the running code authenticates
> through Supabase Auth and joins on `auth.users.id`. Getting this wrong is the classic
> "every query returns `[]` silently" failure.

> **Naming rule (landmine #2):** this fork uses **snake_case** for both table and column
> names. Upstream Prisma used PascalCase tables / camelCase columns; nothing copy-pastes.

---

## 1. `users`

**Source:** upstream `User` model (cuid → overridden to uuid here).
**Enums:** `role user_role` (`ADMIN`, `USER`).

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | FK → `auth.users(id) ON DELETE CASCADE` |
| `name` | text | copied from `raw_user_meta_data.name` on sign-up |
| `email` | text unique | copied from `auth.users.email` |
| `image` | text | |
| `role` | user_role | default `'USER'` |
| `has_access` | boolean | default `false` |
| `headline`, `bio`, `interests text[]`, `location`, `website` | | preserved from upstream for forward-compat |
| `created_at`, `updated_at` | timestamptz | |

**Populated by:** `handle_new_user()` trigger on `auth.users` insert (landmine #5). Without
it, no profile row exists and every join misses.

**Features / actions using it:**
- `src/lib/supabase/server.ts:102` — `getCurrentUser()` joins `auth.users.id` to `public.users`
  to read `role` / `has_access`. **This is why `id` must be uuid.**
- Joined as `user:users(name, image)` in `presentationActions.ts:396`,
  `sharedPresentationActions.ts:49`, `theme-actions.ts:402`.

**RLS:**
- `users_select_self` — `select` where `auth.uid() = id`.
- `users_update_self` — `update` where `auth.uid() = id`.
- No INSERT policy: profiles are created only by the SECURITY DEFINER trigger, not by
  clients.

---

## 2. `base_documents`

**Source:** upstream `BaseDocument`. `type` is the `document_type` enum (all 9 values);
`document_type` is a free `text` (the fork inserts `"presentation"`).

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `title` | text not null | |
| `type` | document_type not null | e.g. `'PRESENTATION'` |
| `document_type` | text not null default `'presentation'` | |
| `thumbnail_url` | text | |
| `user_id` | uuid not null → `users(id)` cascade | |
| `is_public` | boolean not null default false | drives public sharing |
| `created_at`, `updated_at` | timestamptz | |

**Features / actions using it:** the core document store for every presentation.
- `presentationActions.ts:169` create, `:321` update, `:479` delete, `:518/:557` read.
- `fetchPresentations.ts:91/:107` list (owner-scoped).
- `presentationFavoriteActions.ts:32` favourite eligibility check.
- `sharedPresentationActions.ts:47` public read; `:114` toggle public.
- `src/server/share/authorization.ts:29/:49` `canReadDocument` / `canEditDocument`
  (the real public-sharing rule: `is_public OR owner`).
- `presentation-thumbnail-actions.ts:59/:75` thumbnail updates.

**RLS:**
- `base_documents_select_owner` — `select` where `auth.uid() = user_id`.
- `base_documents_select_public` — `select` where `is_public = true` (**anonymous allowed**).
- `base_documents_insert_owner` — `insert` where `auth.uid() = user_id`.
- `base_documents_update_owner` / `base_documents_delete_owner` — owner only.

---

## 3. `presentations`

**Source:** upstream `Presentation`. **1:1 identity relation** with `base_documents`
(landmine #3). Upstream shared the PK (`fields:[id], references:[id]`); the fork names the
FK `document_id` and keeps `id` as its own PK. We reproduce the semantic with
`document_id uuid UNIQUE REFERENCES base_documents(id) ON DELETE CASCADE`.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `document_id` | uuid not null UNIQUE → `base_documents(id)` cascade | the 1:1 link |
| `content` | jsonb | |
| `theme` | text not null default `'mystique'` | |
| `image_source` | text | |
| `presentation_style` | text | |
| `customization` | jsonb | |
| `language` | text | |
| `outline` | text[] | (`String[]` → `text[]`) |
| `prompt` | text | |
| `search_results`, `tool_calls`, `selected_chunks` | jsonb | |
| `created_at`, `updated_at` | timestamptz | |

**Features / actions using it:**
- `presentationActions.ts:186` create, `:351` update (`.eq("document_id", id)`),
  `:636` duplicate.
- Read via the `presentation:presentations(...)` embed in `sharedPresentationActions.ts:49`,
  `presentationActions.ts:519/:558`, `fetchPresentations.ts:93/:109`.
- `templateId` from upstream is **deliberately dropped** (not referenced by code).

**RLS:** all four commands gated by an EXISTS subquery on the parent `base_documents`
(owner OR public). This keeps the 1:1 secure without leaking through the child table.

---

## 4. `presentation_themes`

**Source:** upstream `PresentationTheme`, which was `@@map("CustomTheme")`. **Landmine #1:**
model name `PresentationTheme`, upstream physical table `CustomTheme`, fork query
`presentation_themes` — three different strings. Code wins → `presentation_themes`.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `name` | text not null | |
| `description` | text | |
| `theme_data` | jsonb not null | (`Prisma Json` → `jsonb`) |
| `logo_url` | text | |
| `is_public` | boolean not null default false | public gallery flag |
| `is_admin` | boolean not null default false | system/seeded theme flag |
| `user_id` | uuid → `users(id)` cascade | nullable for admin-seeded themes |
| `created_at`, `updated_at` | timestamptz | |

**Features / actions using it:**
- `theme-actions.ts:50` create, `:120` update, `:190` update admin, `:467` delete,
  `:278` list own, `:231` list admin, `:331` public gallery, `:401` by id.
- Joined as `theme:presentation_themes` in `theme-favorite-actions.ts:143`.

**RLS:**
- `presentation_themes_select` — `select` where `is_public OR is_admin OR auth.uid() = user_id`.
  (Public + system themes readable by anyone; private only by owner.)
- `presentation_themes_insert` — `insert` where `auth.uid() = user_id`.
- `presentation_themes_update` / `presentation_themes_delete` — owner only.

---

## 5. `presentation_theme_likes`

**Source:** upstream `PresentationThemeLike`. `@@unique([userId, themeId])` is the like
toggle's idempotency (landmine: unique constraints carry behaviour).

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid not null → `users(id)` cascade | |
| `theme_id` | uuid not null → `presentation_themes(id)` cascade | |
| `created_at` | timestamptz | |
| **unique** | | `(user_id, theme_id)` |

**Features / actions:** `theme-like-actions.ts:58/:74/:81/:126/:194` toggle + counts.

**RLS:** select/insert/delete all scoped to `auth.uid() = user_id` (a user only ever
touches their own like rows).

---

## 6. `favorite_presentation_themes`

**Source:** upstream `FavoritePresentationTheme`. Same unique `(user_id, theme_id)`
idempotency as likes.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid not null → `users(id)` cascade | |
| `theme_id` | uuid not null → `presentation_themes(id)` cascade | |
| `created_at` | timestamptz | |
| **unique** | | `(user_id, theme_id)` |

**Features / actions:** `theme-favorite-actions.ts:52/:74/:141/:199` toggle + list.

**RLS:** select/insert/delete scoped to `auth.uid() = user_id`.

---

## 7. `favorite_documents`

**Source:** upstream `FavoriteDocument` (`id @default(uuid())`). Unique `(user_id,
document_id)` — the document-favourite toggle idempotency. Code does
`upsert(..., {onConflict:"user_id,document_id", ignoreDuplicates:true})` and deletes by `id`,
so both the unique constraint and a real PK are required.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid not null → `users(id)` cascade | |
| `document_id` | uuid not null → `base_documents(id)` cascade | |
| `created_at` | timestamptz | |
| **unique** | | `(user_id, document_id)` |

**Features / actions:** `presentationFavoriteActions.ts:72/:116/:159/:187` add/remove/toggle.

**RLS:** select/insert/delete scoped to `auth.uid() = user_id`.

---

## 8. `font_pairs`

**Source:** upstream `FontPair`. `heading_weight`/`body_weight` keep upstream defaults
(`700` / `400`) — harmless since the code inserts them explicitly.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `heading` | text not null | |
| `heading_url` | text | |
| `heading_weight` | integer not null default 700 | |
| `body` | text not null | |
| `body_url` | text | |
| `body_weight` | integer not null default 400 | |
| `user_id` | uuid not null → `users(id)` cascade | |
| `created_at`, `updated_at` | timestamptz | |

**Features / actions:** `font-pair-actions.ts:49` create, `:107` list, `:144` ownership
check, `:179` delete.

**RLS:** select/insert/update/delete scoped to `auth.uid() = user_id`.

---

## 9. `generated_images`

**Source:** upstream `GeneratedImage` (only `id, url, createdAt, updatedAt, userId, prompt`).
This fork added nullable metadata columns read via `select("*")` in `fetch.ts` — included
as nullable so the read path doesn't break. No insert path populates them yet.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `url` | text not null | |
| `prompt` | text not null | |
| `user_id` | uuid not null → `users(id)` cascade | |
| `model`, `size`, `quality`, `format` | text | nullable fork additions |
| `compression` | integer | nullable |
| `background`, `action` | text | nullable |
| `previous_response_id` | text | nullable |
| `created_at`, `updated_at` | timestamptz | |

**Features / actions:** `generate.ts:38`, `generate-slide-image.ts:73`,
`generate-infographic.ts:159` insert; `fetch.ts:40` list.

**RLS:** select/insert/update/delete scoped to `auth.uid() = user_id`.

---

## Enums

- `user_role` — `ADMIN`, `USER` (upstream `UserRole`).
- `document_type` — `NOTE, DOCUMENT, DRAWING, DESIGN, STICKY_NOTES, MIND_MAP,
  RESEARCH_PAPER, FLIPBOOK, PRESENTATION` (all nine upstream values, verbatim).

## Explicitly NOT ported

- **`Account`** (NextAuth cruft) — dropped on purpose. This fork uses Supabase Auth.
- **`Presentation.templateId`** — not referenced by any query; omitted.
- **`BaseDocument.password`, `emailVerified`** — upstream NextAuth fields; not used here.

## Triggers

- `on_auth_user_created` (AFTER INSERT ON `auth.users`) → `handle_new_user()`
  (SECURITY DEFINER) inserts the matching `public.users` row. **Critical for sign-up.**
- `set_updated_at_<table>` (BEFORE UPDATE) on `users, base_documents, presentations,
  presentation_themes, font_pairs, generated_images` → maintains `updated_at` now that
  Prisma's `@updatedAt` is gone (landmine #7).
