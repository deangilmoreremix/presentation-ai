"use client";

import * as React from "react";

export const PROVIDER_KEY_REQUIRED = "PROVIDER_KEY_REQUIRED";

/**
 * Tracks which BYOK provider (if any) is missing a credential so any
 * generation surface can open the API key modal and focus the right card.
 */
const ByokPromptContext = React.createContext<{
  /** The provider a blocked workflow needs, or null when nothing is blocked. */
  missingProvider: string | null;
  /** Ask the user to connect a provider. */
  requireProvider: (provider?: string) => void;
  /** Clear the blocked state. */
  clearMissingProvider: () => void;
}>({
  missingProvider: null,
  requireProvider: () => {},
  clearMissingProvider: () => {},
});

export function ByokPromptProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [missingProvider, setMissingProvider] = React.useState<
    string | null
  >(null);

  const requireProvider = React.useCallback((provider?: string) => {
    setMissingProvider(provider ?? "openai");
  }, []);

  const clearMissingProvider = React.useCallback(() => {
    setMissingProvider(null);
  }, []);

  // Central BYOK enforcement for every generation surface: any request that
  // fails because the authenticated user has no provider credential opens the
  // API key modal automatically. Patching fetch once here avoids every caller
  // having to re-implement the same detection.
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const nativeFetch = window.fetch;
    // Guard against double-patching in development with Fast Refresh.
    if ((nativeFetch as { __byokWrapped?: boolean }).__byokWrapped) return;

    const wrapped: typeof fetch = async (input, init) => {
      const response = await nativeFetch(input, init);

      try {
        if (response.status === 402) {
          const clone = response.clone();
          const payload = (await clone.json()) as {
            code?: string;
            provider?: string;
          };
          if (payload?.code === PROVIDER_KEY_REQUIRED) {
            requireProvider(payload.provider ?? "openai");
          }
        }
      } catch {
        // Non-JSON 402s are not BYOK failures; ignore.
      }

      return response;
    };

    (wrapped as { __byokWrapped?: boolean }).__byokWrapped = true;
    window.fetch = wrapped;

    return () => {
      window.fetch = nativeFetch;
    };
  }, [requireProvider]);

  const value = React.useMemo(
    () => ({ missingProvider, requireProvider, clearMissingProvider }),
    [missingProvider, requireProvider, clearMissingProvider],
  );

  return (
    <ByokPromptContext.Provider value={value}>
      {children}
    </ByokPromptContext.Provider>
  );
}

/** Reads the BYOK prompt state. */
export function useByokPrompt() {
  return React.useContext(ByokPromptContext);
}


/**
 * Extracts the provider id from a structured BYOK failure, or null when the
 * error is unrelated or the shape is unknown.
 */
export function parseProviderKeyRequired(
  error: unknown,
): string | null {
  const candidate = error as {
    code?: string;
    provider?: string;
    message?: string;
  } | null;

  if (!candidate) return null;

  if (candidate.code === PROVIDER_KEY_REQUIRED) {
    return candidate.provider ?? "openai";
  }

  // Some error surfaces serialize the payload into a message string.
  if (
    typeof candidate.message === "string" &&
    candidate.message.includes(PROVIDER_KEY_REQUIRED)
  ) {
    const match = candidate.message.match(/"provider"\s*:\s*"([^"]+)"/);
    return match?.[1] ?? "openai";
  }

  return null;
}
