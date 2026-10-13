"use client";

import * as React from "react";
import { ApiKeyModal, type ByokProvider } from "@/components/settings/ApiKeyModal";
import { useByokPrompt } from "@/components/settings/ByokPromptProvider";

interface ProviderRecord {
  provider: ByokProvider;
  configured: boolean;
  lastValidatedAt?: string | null;
}

/**
 * Global BYOK gate.
 *
 * Any generation workflow can call `requireProvider()` when a request fails
 * because the user has no credential. This component then opens the existing
 * API key modal, focused on the provider that was actually required.
 */
export function ByokGate() {
  const { missingProvider, clearMissingProvider } = useByokPrompt();
  const [statuses, setStatuses] = React.useState<
    Record<ByokProvider, ProviderRecord | undefined>
  >({ openai: undefined, muapi: undefined });

  const loadStatuses = React.useCallback(async () => {
    try {
      const response = await fetch("/api/user/api-key", {
        credentials: "include",
      });
      if (!response.ok) return;
      const data = await response.json();
      const next: Record<ByokProvider, ProviderRecord | undefined> = {
        openai: undefined,
        muapi: undefined,
      };
      for (const entry of (data.providers ?? []) as ProviderRecord[]) {
        next[entry.provider] = entry;
      }
      setStatuses(next);
    } catch {
      // Status metadata is best-effort; the modal still works without it.
    }
  }, []);

  React.useEffect(() => {
    if (missingProvider) void loadStatuses();
  }, [missingProvider, loadStatuses]);

  const handleSave = React.useCallback(
    async (provider: ByokProvider, key: string) => {
      const response = await fetch("/api/user/api-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ provider, key }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save API key");
      }

      clearMissingProvider();
    },
    [clearMissingProvider],
  );

  const handleRemove = React.useCallback(
    async (provider: ByokProvider) => {
      const response = await fetch(
        `/api/user/api-key?provider=${encodeURIComponent(provider)}`,
        { method: "DELETE", credentials: "include" },
      );
      if (!response.ok) throw new Error("Failed to remove API key");
    },
    [],
  );

  return (
    <ApiKeyModal
      open={Boolean(missingProvider)}
      onClose={clearMissingProvider}
      onSave={handleSave}
      statuses={statuses}
      highlightProvider={(missingProvider as ByokProvider) ?? null}
      onRemove={handleRemove}
    />
  );
}
