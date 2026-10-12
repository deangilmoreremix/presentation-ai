"use client";

import * as React from "react";
import { registerByokHandler } from "@/lib/ai/byok-client";

/**
 * Tracks which BYOK provider (if any) is missing a credential so any
 * generation surface can open the API key modal and focus the right card.
 *
 * This provider deliberately does not patch `window.fetch`. Handlers are
 * registered and disposed here, so lifecycle is explicit and unrelated
 * requests are never touched.
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

  React.useEffect(() => {
    // Registered on mount, removed on unmount. Never wraps global fetch, so
    // React StrictMode's double-invoke cannot leave two handlers behind.
    return registerByokHandler(requireProvider);
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
