-- Add server-side encrypted API key storage columns to users table
-- This enables the encrypted OpenAI API key feature in /api/user/api-key

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS openai_api_key_encrypted text,
  ADD COLUMN IF NOT EXISTS openai_api_key_iv text;

COMMENT ON COLUMN public.users.openai_api_key_encrypted IS 'AES-256-GCM encrypted OpenAI API key (base64 ciphertext + auth tag)';
COMMENT ON COLUMN public.users.openai_api_key_iv IS 'Base64-encoded 128-bit IV for API key decryption';
