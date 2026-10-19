import { auth } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";
import { decryptApiKey } from "@/lib/crypto/key-encryption";

/**
 * BYOK credential resolution.
 *
 * Every credential returned from this module is resolved from the
 * authenticated Clerk session. There is deliberately NO fallback to any
 * platform-owned key: a missing key is a hard, structured failure.
 */

export type AiProvider = "openai" | "muapi";

/** Stable, machine-readable error code surfaced to clients. */
export const PROVIDER_KEY_REQUIRED = "PROVIDER_KEY_REQUIRED" as const;

export class ProviderKeyRequiredError extends Error {
  readonly code = PROVIDER_KEY_REQUIRED;
  readonly provider: AiProvider;

  constructor(provider: AiProvider, message?: string) {
    super(
      message ??
        `No ${provider === "openai" ? "OpenAI" : "MuAPI"} API key is configured. Add your own API key to enable this feature.`,
    );
    this.name = "ProviderKeyRequiredError";
    this.provider = provider;
  }
}

/** Columns that hold encrypted credentials, per provider. */
const KEY_COLUMNS: Record<AiProvider, { encrypted: string; iv: string }> = {
  openai: {
    encrypted: "openai_api_key_encrypted",
    iv: "openai_api_key_iv",
  },
  muapi: {
    encrypted: "muapi_api_key_encrypted",
    iv: "muapi_api_key_iv",
  },
};

type CredentialRow = {
  openai_api_key_encrypted?: string | null;
  openai_api_key_iv?: string | null;
  muapi_api_key_encrypted?: string | null;
  muapi_api_key_iv?: string | null;
};

/**
 * Resolves the authenticated Clerk user id.
 *
 * The identity is always taken from the server-side Clerk session. A caller
 * can never supply a user id, which makes cross-user credential access
 * impossible through this path.
 */
export async function requireAuthenticatedUserId(): Promise<string> {
  const { userId } = await auth();
  if (!userId) {
    throw new ProviderKeyRequiredError(
      "openai",
      "You must be signed in to use AI features.",
    );
  }
  return userId;
}

/**
 * Reads the encrypted credential row for the authenticated user only.
 * Returns null when the user has no stored credential for the provider.
 */
async function readCredentialRow(
  provider: AiProvider,
): Promise<CredentialRow | null> {
  const userId = await requireAuthenticatedUserId();

  const supabase = await createClient();
  // Missing database configuration must fail securely: no credentials, and
  // never a fallback to a platform key.
  if (!supabase) {
    throw new Error(
      "Database is not configured. Encrypted API key storage is unavailable.",
    );
  }

  const { encrypted, iv } = KEY_COLUMNS[provider];
  const columns = [encrypted, iv].join(", ");
  const { data, error } = await supabase
    .from("users")
    .select(columns)
    .eq("id", userId)
    .maybeSingle<CredentialRow>();

  if (error) {
    // Never leak the underlying error text (it can contain query context).
    throw new Error("Failed to load stored API key.");
  }

  return data ?? null;
}

/**
 * Resolves the authenticated user's own decrypted credential for a provider.
 *
 * Throws {@link ProviderKeyRequiredError} when the user is not signed in or
 * has no stored credential. Decryption failures throw a plain Error and are
 * NEVER translated into a platform-key fallback.
 */
export async function resolveProviderCredential(
  provider: AiProvider,
): Promise<string> {
  const row = await readCredentialRow(provider);
  const { encrypted, iv } = KEY_COLUMNS[provider];
  const storedEncrypted = row?.[encrypted as keyof CredentialRow] ?? null;
  const storedIv = row?.[iv as keyof CredentialRow] ?? null;

  if (!storedEncrypted || !storedIv) {
    throw new ProviderKeyRequiredError(provider);
  }

  const userId = await requireAuthenticatedUserId();
  // The KEK is derived from the authenticated user's id, so a ciphertext
  // belonging to another user cannot be decrypted here even if it were
  // returned by mistake.
  const plaintext = await decryptApiKey(storedEncrypted, userId, storedIv);
  const trimmed = plaintext.trim();

  if (!trimmed) {
    throw new ProviderKeyRequiredError(provider);
  }

  return trimmed;
}

/**
 * Safe metadata only: whether a credential is configured. Never returns,
 * derives, logs, or transmits any part of the plaintext credential.
 */
export async function getProviderCredentialStatus(
  provider: AiProvider,
): Promise<{ configured: boolean }> {
  try {
    const row = await readCredentialRow(provider);
    const { encrypted, iv } = KEY_COLUMNS[provider];
    const storedEncrypted = row?.[encrypted as keyof CredentialRow] ?? null;
    const storedIv = row?.[iv as keyof CredentialRow] ?? null;
    return { configured: Boolean(storedEncrypted && storedIv) };
  } catch {
    // Fail closed for status reporting; never reveal why.
    return { configured: false };
  }
}

/**
 * Stores an encrypted credential for the authenticated user and provider.
 * The plaintext key is never returned, logged, or persisted in plaintext.
 */
export async function storeProviderCredential(
  provider: AiProvider,
  plaintextKey: string,
): Promise<void> {
  const userId = await requireAuthenticatedUserId();
  const trimmed = plaintextKey.trim();

  if (!trimmed) {
    throw new ProviderKeyRequiredError(provider, "API key must not be empty.");
  }

  const { encryptApiKey } = await import("@/lib/crypto/key-encryption");
  const { encrypted, iv } = await encryptApiKey(trimmed, userId);

  const supabase = await createClient();
  if (!supabase) {
    throw new Error(
      "Database is not configured. Encrypted API key storage is unavailable.",
    );
  }

  const { encrypted: encCol, iv: ivCol } = KEY_COLUMNS[provider];
  const { error } = await supabase
    .from("users")
    .update({ [encCol]: encrypted, [ivCol]: iv })
    .eq("id", userId);

  if (error) {
    throw new Error("Failed to store API key.");
  }
}

/** Removes the authenticated user's stored credential for a provider. */
export async function deleteProviderCredential(provider: AiProvider): Promise<void> {
  const userId = await requireAuthenticatedUserId();

  const supabase = await createClient();
  if (!supabase) {
    throw new Error(
      "Database is not configured. Encrypted API key storage is unavailable.",
    );
  }

  const { encrypted: encCol, iv: ivCol } = KEY_COLUMNS[provider];
  const { error } = await supabase
    .from("users")
    .update({ [encCol]: null, [ivCol]: null })
    .eq("id", userId);

  if (error) {
    throw new Error("Failed to delete API key.");
  }
}

/** Backwards-compatible helper used by OpenAI-specific call sites. */
export async function resolveOpenAICredential(): Promise<string> {
  return resolveProviderCredential("openai");
}

/** Backwards-compatible helper used by MuAPI-specific call sites. */
export async function resolveMuAPICredential(): Promise<string> {
  return resolveProviderCredential("muapi");
}
