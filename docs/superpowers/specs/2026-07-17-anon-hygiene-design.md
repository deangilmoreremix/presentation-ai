# Anonymous-session hygiene: stale-user cleanup + drop shared fallback

Date: 2026-07-17
Status: Approved (user approved approach "a", 7-day retention, fallback approach A)

## Context

presentation-ai is open to everyone with no login. Each visitor is given a
distinct **Supabase anonymous session** on load, so their content is isolated
per-visitor (app-level ownership checks in `src/server/share/authorization.ts`).

The database is **shared by many other apps**. Therefore any change must be
strictly scoped to presentation-ai's own artifacts and must never alter global
DB behavior in a way that could affect other apps (no RLS flips on shared
tables, no role changes, no deleting other apps' data).

Two loose ends remain from enabling anonymous sessions:

1. Every visitor creates a throwaway `auth.users` row (`is_anonymous = true`).
   These accumulate. We need periodic cleanup of the **empty, stale** ones.
2. `getCurrentUser()` (`src/lib/supabase/server.ts`) falls back to a single
   shared anonymous user (`ANONYMOUS_USER_ID`) when there is no session. That
   fallback is now the only remaining isolation hole for cookieless requests.

## Goals

- Automatically delete stale, content-free anonymous users.
- Remove the shared-anon fallback so isolation is airtight.
- Zero risk to the shared multi-app database and other apps' data.

## Non-goals

- Enabling RLS on `base_documents` / `presentations` (rejected earlier: risky on
  a shared DB; app-level isolation is the chosen model).
- Touching any non-presentation-ai table or any non-anonymous user.
- Deleting anonymous users that still own content.

## Task 1 — Cleanup of stale anonymous users

**Mechanism:** SQL function `public.cleanup_stale_anonymous_users(retention interval)`
plus a daily `pg_cron` schedule. Delivered as migration
`010_cleanup_anonymous_users.sql`.

**Deletion predicate (all must hold):**
- `auth.users.is_anonymous = true`
- `coalesce(last_sign_in_at, created_at) < now() - retention` (default `7 days`)
- Owns **zero** rows in `public.base_documents` (i.e. no presentation-ai content)

**Safety:**
- Never deletes non-anonymous users.
- Never deletes anonymous users with content.
- Never touches other apps' tables.
- Idempotent migration; guarded so it no-ops cleanly if `pg_cron` is unavailable.
- Function returns the count of deleted rows for observability.

**Rollout guardrail:** The subagent WRITES the migration and prints the exact
SQL. It does NOT execute anything against the remote/shared DB. The SQL is
presented to the user for approval before it is applied.

**Retention window:** 7 days (parameterized; default in the cron job).

## Task 2 — Drop the shared-anon fallback

**Change:** In `src/lib/supabase/server.ts`, `getCurrentUser()` returns `null`
when there is no Supabase session (instead of returning `ANONYMOUS_USER`).

- The authenticated branch is unchanged.
- `ANONYMOUS_USER_ID` (and the seeded DB row) remain exported — other code
  imports the constant, and the row satisfies any lingering FK references.
- Server actions already treat `null` as "Unauthorized", and the client always
  establishes an anonymous session on load, so normal browser usage is
  unaffected. Only genuinely cookieless requests lose the shared bucket.

**Tests:** Update `tests/unit/lib/supabase/server.test.ts` so the two
no-session cases expect `null` again; keep the authenticated-enrichment cases.

## Verification

- `npx tsc --noEmit` clean.
- `tests/unit/lib/supabase/server.test.ts` and
  `tests/unit/provider/SupabaseAuthProvider.test.tsx` pass.
- Cleanup: dry-run the SELECT form of the predicate against remote (read-only)
  to show how many rows WOULD be deleted before applying the function.

## Execution

Two independent Superpowers subagents in parallel (no shared files):
- Agent T1: Task 1 (migration + SQL, write-only, no remote execution).
- Agent T2: Task 2 (server fallback + tests).
