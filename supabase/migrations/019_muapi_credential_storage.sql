-- Migration 019: MuAPI credential storage + key validation timestamps
--
-- Extends the existing BYOK credential storage introduced in migration 012.
-- 012 added `openai_api_key_encrypted` / `openai_api_key_iv` to `public.users`
-- and this migration follows that exact pattern for MuAPI, plus non-sensitive
-- "last validated" timestamps for both providers.
--
-- SECURITY NOTES
-- - Credentials are stored as AES-256-GCM ciphertext (see
--   src/lib/crypto/key-encryption.ts). Plaintext keys are never persisted and
--   never returned by any endpoint.
-- - The data encryption key is derived per user with scrypt, salted by the
--   Clerk user id, so a ciphertext is only decryptable by its owner.
-- - `*_last_validated_at` holds only a timestamp; it is safe to expose and is
--   what the API key modal displays as connection metadata.
--
-- SHARED-DATABASE SAFETY
-- - This migration only ADDs columns to `public.users` (additive, idempotent
--   with `if not exists`). It does not drop, rename, retype, or repopulate any
--   existing column, table, function, policy, or trigger, and it does not
--   touch any other application's objects.
-- - STAGED, NOT APPLIED: applying this to a production/shared database
--   requires explicit owner approval.

alter table public.users
  add column if not exists muapi_api_key_encrypted text,
  add column if not exists muapi_api_key_iv text,
  add column if not exists openai_last_validated_at timestamptz,
  add column if not exists muapi_last_validated_at timestamptz;

comment on column public.users.muapi_api_key_encrypted is 'AES-256-GCM encrypted MuAPI API key (base64 ciphertext + auth tag)';
comment on column public.users.muapi_api_key_iv is 'Base64-encoded 128-bit IV for MuAPI API key decryption';
comment on column public.users.openai_last_validated_at is 'Timestamp of the last successful server-side validation of the user OpenAI key (metadata only)';
comment on column public.users.muapi_last_validated_at is 'Timestamp of the last successful server-side validation of the user MuAPI key (metadata only)';

-- RLS on public.users is already enabled (migration 007) and the existing
-- `users_select_self` / `users_update_self` policies scope every read and write
-- to `auth.uid() = id`, so the new columns inherit the same isolation as the
-- OpenAI credential columns. No new policy is required.
