-- Migration 010: Cleanup stale anonymous Supabase users.
--
-- This migration adds a scoped, safe periodic cleanup of stale anonymous
-- Supabase users. This database is SHARED by many other apps, so this
-- housekeeping is strictly scoped and will NEVER affect other apps' data or
-- non-anonymous users.
--
-- Safety scope:
--   * Only targets rows in auth.users where is_anonymous = true.
--   * Only deletes users that have been stale longer than the retention window.
--   * Only deletes users that own ZERO rows in public.base_documents.
--   * Never touches any other table or any non-anonymous user.
--   * This is presentation-ai-owned housekeeping on a shared multi-app DB.

-- ============================================================================
-- 1. Cleanup function
-- ============================================================================

create or replace function public.cleanup_stale_anonymous_users(
  retention interval default interval '7 days'
)
returns integer
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  deleted_count integer;
begin
  delete from auth.users
  where is_anonymous = true
    and coalesce(last_sign_in_at, created_at) < now() - retention
    and not exists (
      select 1
      from public.base_documents b
      where b.user_id = auth.users.id
    );

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

comment on function public.cleanup_stale_anonymous_users(interval) is
  'presentation-ai-owned housekeeping: deletes stale anonymous users with no base_documents. Scoped to auth.users where is_anonymous = true only.';

-- ============================================================================
-- 2. Guarded daily pg_cron schedule
-- ============================================================================

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    if exists (
      select 1
      from cron.job
      where jobname = 'presentation_ai_cleanup_stale_anonymous_users'
    ) then
      perform cron.unschedule(
        (select job_id from cron.job where jobname = 'presentation_ai_cleanup_stale_anonymous_users')
      );
    end if;

    perform cron.schedule(
      'presentation_ai_cleanup_stale_anonymous_users',
      '17 3 * * *',
      'select public.cleanup_stale_anonymous_users();'
    );
  else
    raise notice 'pg_cron extension is not installed; skipping anonymous user cleanup schedule.';
  end if;
end;
$$;

-- ============================================================================
-- 3. Dry-run query (read-only)
-- ============================================================================
--
-- DRY RUN: select count(*) from auth.users u where u.is_anonymous = true and coalesce(u.last_sign_in_at, u.created_at) < now() - interval '7 days' and not exists (select 1 from public.base_documents b where b.user_id = u.id);
