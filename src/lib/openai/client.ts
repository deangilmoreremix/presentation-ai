import OpenAI from "openai";
import { resolveOpenAICredential } from "@/lib/ai/provider-credentials";

/**
 * Creates an OpenAI client using the authenticated user's own API key.
 * Used by all AI generation actions.
 *
 * BYOK: there is no fallback to a platform-owned key. If the user has not
 * configured their own OpenAI key this throws, and callers surface
 * `PROVIDER_KEY_REQUIRED` so the UI can open the API key modal.
 */
export async function getOpenAIClient(): Promise<OpenAI> {
  const apiKey = await resolveOpenAICredential();

  return new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: false, // Server-side only
  });
}

/**
 * Resolves the current user's OpenAI API key, or null when unconfigured.
 * Never falls back to a platform key.
 */
export async function resolveUserApiKey(): Promise<string | null> {
  try {
    return await resolveOpenAICredential();
  } catch {
    return null;
  }
}
