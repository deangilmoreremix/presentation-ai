import {
  PROVIDER_KEY_REQUIRED,
  ProviderKeyRequiredError,
} from "@/lib/ai/provider-credentials";
import type { ByokProvider } from "@/lib/ai/byok-client";

/**
 * Normalizes a thrown server-action error into a structured result.
 *
 * A missing BYOK credential is reported with a stable `code` and `provider`
 * so the client can open the API key modal without string-matching prose.
 * The message is the user-facing part; no credential material is included.
 */
export function toActionErrorResult(error: unknown, fallback: string): {
  success: false;
  error: string;
  code?: string;
  provider?: ByokProvider;
} {
  if (error instanceof ProviderKeyRequiredError) {
    return {
      success: false,
      error: error.message,
      code: PROVIDER_KEY_REQUIRED,
      provider: error.provider,
    };
  }

  const provider = (error as { provider?: ByokProvider } | null)?.provider;
  const code = (error as { code?: string } | null)?.code;

  if (code === PROVIDER_KEY_REQUIRED) {
    return {
      success: false,
      error: error instanceof Error ? error.message : fallback,
      code: PROVIDER_KEY_REQUIRED,
      provider: provider ?? "openai",
    };
  }

  return {
    success: false,
    error: error instanceof Error ? error.message : fallback,
  };
}
