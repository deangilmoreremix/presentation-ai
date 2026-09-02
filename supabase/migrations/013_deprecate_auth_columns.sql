-- Deprecate users.role and users.has_access for authz
--
-- Authz has moved to Clerk publicMetadata. These columns are retained
-- only for backwards compatibility and may be removed in a future migration.

COMMENT ON COLUMN public.users.role IS 'DEPRECATED: Authz now uses Clerk publicMetadata.role. This column is no longer the source of truth.';
COMMENT ON COLUMN public.users.has_access IS 'DEPRECATED: Authz now uses Clerk publicMetadata.hasAccess. This column is no longer the source of truth.';

-- Reset existing rows to safe defaults. Authz is enforced in Clerk, not here.
UPDATE public.users
SET
  role = 'USER'::public.user_role,
  has_access = false
WHERE role <> 'USER'::public.user_role OR has_access = true;
