/**
 * Scoped BYOK error handling.
 *
 * This module deliberately does NOT patch `window.fetch`. A global patch
 * applies to every request in the app — React Query, the Next.js router,
 * analytics, third-party SDKs — and `response.clone()` on a streaming SSE
 * body can break the stream the caller is about to consume. Instead:
 *
 * - the provider registers a single handler here on mount, and unregisters it
 *   on unmount (no lifecycle coupling to fetch);
 * - generation call sites invoke `byokFetch` or `handleByokError` explicitly;
 * - server actions return a structured `code`/`provider` on the error result,
 *   so clients never have to string-match prose.
 */

export const PROVIDER_KEY_REQUIRED = "PROVIDER_KEY_REQUIRED";

export type ByokProvider = "openai" | "muapi";

type ByokHandler = (provider: string) => void;

let activeHandler: ByokHandler | null = null;

/**
 * Registers the handler that opens the API key modal. Returns a disposer that
 * removes it only if it is still the one this call installed.
 */
export function registerByokHandler(handler: ByokHandler): () => void {
  activeHandler = handler;
  return () => {
    if (activeHandler === handler) {
      activeHandler = null;
    }
  };
}

/** Opens the API key modal for the provider a workflow actually needs. */
export function notifyByokError(provider?: string): void {
  activeHandler?.(provider ?? "openai");
}

function readProvider(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

/**
 * Extracts the provider id from a structured BYOK failure, or null when the
 * value is unrelated or the shape is unknown.
 */
export function parseByokError(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;

  const candidate = payload as { code?: unknown; provider?: unknown };
  if (candidate.code === PROVIDER_KEY_REQUIRED) {
    return readProvider(candidate.provider) ?? "openai";
  }

  return null;
}

/**
 * Detects a BYOK failure on the result of a server action.
 *
 * Server actions do not produce HTTP responses, so they carry the code
 * explicitly on the error object rather than relying on a status code.
 */
export function byokErrorFromResult(
  result: { success?: boolean; error?: unknown; code?: unknown; provider?: unknown } | null | undefined,
): string | null {
  if (!result || result.success !== false) return null;
  return parseByokError(result) ?? null;
}

/** True when a thrown error (or its stringified message) is a BYOK failure. */
export function byokProviderFromError(error: unknown): string | null {
  if (!error) return null;

  const direct = parseByokError(error);
  if (direct) return direct;

  const message = error instanceof Error ? error.message : undefined;
  if (typeof message === "string" && message.includes(PROVIDER_KEY_REQUIRED)) {
    try {
      const match = message.match(/\{[\s\S]*\}/);
      if (match) return parseByokError(JSON.parse(match[0])) ?? "openai";
    } catch {
      // Not JSON after all; fall through to the default below.
    }
    return "openai";
  }

  return null;
}

/**
 * Fetch wrapper for AI generation routes only.
 *
 * Use this instead of `fetch` at generation call sites. It inspects the
 * response for a BYOK failure and opens the modal, then returns the original
 * response untouched so normal streaming and error handling still work.
 */
export async function byokFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const response = await fetch(input, init);

  if (response.status !== 402) return response;

  try {
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) return response;

    // Clone is safe here: this wrapper is only applied to JSON error
    // responses, never to the SSE streams returned by generation routes on
    // success. A 402 is always a terminal JSON body.
    const payload = (await response.clone().json()) as unknown;
    const provider = parseByokError(payload);
    if (provider) notifyByokError(provider);
  } catch {
    // Non-JSON 402s are not BYOK failures; leave them for normal handling.
  }

  return response;
}
