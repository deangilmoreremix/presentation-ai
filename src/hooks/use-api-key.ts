"use client";

import { useCallback, useEffect, useState } from "react";
import { getApiKey, saveApiKey, removeApiKey } from "@/lib/key-storage";

const STORAGE_KEY = "openai_api_key";

interface UseApiKey {
  apiKey: string | null;
  setApiKey: (k: string) => void;
  clear: () => void;
}

export function useApiKey(): UseApiKey {
  const [apiKey, setApiKeyState] = useState<string | null>(null);

  useEffect(() => {
    setApiKeyState(getApiKey());

    const handleStorage = (event: StorageEvent) => {
      if (!event.key || event.key === STORAGE_KEY) {
        setApiKeyState(getApiKey());
      }
    };

    const handleCustom = () => setApiKeyState(getApiKey());

    window.addEventListener("storage", handleStorage);
    window.addEventListener("openai-api-key-changed", handleCustom);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("openai-api-key-changed", handleCustom);
    };
  }, []);

  const setApiKey = useCallback((k: string) => {
    saveApiKey(k, "client");
    setApiKeyState(k);
    window.dispatchEvent(new Event("openai-api-key-changed"));
  }, []);

  const clear = useCallback(() => {
    removeApiKey();
    setApiKeyState(null);
    window.dispatchEvent(new Event("openai-api-key-changed"));
  }, []);

  return { apiKey, setApiKey, clear };
}