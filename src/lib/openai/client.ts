import { env } from "@/env";
import OpenAI from "openai";

/**
 * Creates an OpenAI client with the provided API key or fallback.
 * Used by all AI generation actions.
 * Note: Database-dependent API key resolution removed - uses provided key or env var only.
 */
export async function getOpenAIClient(userId?: string, providedApiKey?: string): Promise<OpenAI> {
  // Use provided API key, or fall back to environment
  const apiKey = providedApiKey || env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OpenAI API key is required. Provide one via apiKey parameter or OPENAI_API_KEY env var.");
  }

  return new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: false, // Server-side only
  });
}

/**
 * Stub function for user API key resolution.
 * Database-dependent key lookup removed - returns null to fall back to env var.
 * In Supabase architecture, users provide their API key via the apiKey parameter.
 */
export async function resolveUserApiKey(_userId?: string): Promise<string | null> {
  // No database lookup in Supabase-only architecture
  // Returns null to trigger fallback to env.OPENAI_API_KEY
  return null;
}