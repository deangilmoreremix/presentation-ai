import { NextResponse } from "next/server";
import {
  PROVIDER_KEY_REQUIRED,
  ProviderKeyRequiredError,
  type AiProvider,
} from "@/lib/ai/provider-credentials";

/**
 * Converts a BYOK credential failure into a structured client response.
 *
 * Returns null when the error is unrelated, so callers can fall through to
 * their existing generic error handling.
 */
export function byokErrorResponse(
  error: unknown,
): NextResponse | null {
  if (error instanceof ProviderKeyRequiredError) {
    return NextResponse.json(
      {
        code: PROVIDER_KEY_REQUIRED,
        provider: error.provider,
        error: error.message,
      },
      { status: 402 },
    );
  }

  // Defensive: a failure raised before the typed error could be constructed.
  if (
    error instanceof Error &&
    (error as { code?: string }).code === PROVIDER_KEY_REQUIRED
  ) {
    const provider: AiProvider =
      (error as { provider?: AiProvider }).provider ?? "openai";
    return NextResponse.json(
      { code: PROVIDER_KEY_REQUIRED, provider, error: error.message },
      { status: 402 },
    );
  }

  return null;
}
