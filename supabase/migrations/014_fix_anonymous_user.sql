-- Migration 014: Fix anonymous user permissions
--
-- The anonymous user was previously seeded with ADMIN role and has_access=true.
-- With the move to Clerk auth, anonymous access is no longer granted elevated
-- permissions. Update the anonymous user to standard USER with no access.

UPDATE public.users
SET
  role = 'USER'::public.user_role,
  has_access = false,
  updated_at = now()
WHERE id = '00000000-0000-0000-0000-000000000000';
