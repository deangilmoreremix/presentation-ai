import { decryptApiKey } from "@/lib/crypto/key-encryption";
import { db } from "@/server/db";
import { env } from "@/env";
import OpenAI from "openai";

/**
 * Resolves the API key for a user in the following order:
 * 1. Encrypted key from database (if user has one)
 * 2. Falls back to environment default
 */
export async function resolveUserApiKey(userId: string): Promise<string | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { openaiApiKeyEncrypted: true, openaiApiKeyIv: true },
  });

  if (user?.openaiApiKeyEncrypted && user.openaiApiKeyIv) {
    try {
      return await decryptApiKey(user.openaiApiKeyEncrypted, userId, user.openaiApiKeyIv);
    } catch (error) {
      console.error("Failed to decrypt user API key:", error);
      // Fall through to default
    }
  }

  return null;
}

/**
 * Creates an OpenAI client with the user's API key or fallback.
 * Used by all AI generation actions.
 */
export async function getOpenAIClient(userId: string, providedApiKey?: string): Promise<OpenAI> {
  const apiKey = providedApiKey || (await resolveUserApiKey(userId)) || env.OPENAI_API_KEY;

  return new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: false, // Server-side only
  });
}