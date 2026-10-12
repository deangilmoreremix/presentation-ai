import {
  getProviderCredentialStatus,
  resolveProviderCredential,
  type AiProvider,
} from "@/lib/ai/provider-credentials";

export {
  PROVIDER_KEY_REQUIRED,
  ProviderKeyRequiredError,
} from "@/lib/ai/provider-credentials";

/**
 * Resolves the authenticated user's own OpenAI key.
 *
 * @throws {ProviderKeyRequiredError} when unauthenticated or unconfigured.
 *
 * There is deliberately no platform-key fallback. A decryption failure also
 * throws rather than silently returning null, so no caller can accidentally
 * fall back to owner-funded credentials.
 */
export async function getUserOpenAIKey(): Promise<string> {
  return resolveProviderCredential("openai");
}

/**
 * Safe status metadata for the OpenAI credential.
 * Never returns or derives any part of the plaintext key.
 */
export async function getOpenAIKeyStatus(): Promise<{ configured: boolean }> {
  return getProviderCredentialStatus("openai");
}

/** Resolves the authenticated user's own MuAPI key. */
export async function getUserMuAPIKey(): Promise<string> {
  return resolveProviderCredential("muapi");
}

/** Safe status metadata for the MuAPI credential. */
export async function getMuAPIKeyStatus(): Promise<{ configured: boolean }> {
  return getProviderCredentialStatus("muapi");
}

export type { AiProvider };
