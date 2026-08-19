"use client";

import { useCallback, useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";

const STORAGE_KEY = "smart-presentations-onboarding-welcome-dismissed";

export function useWelcomeOverlay(onClose: () => void) {
  const { isSignedIn, isLoaded } = useUser();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    const dismissed =
      typeof window !== "undefined" &&
      window.localStorage.getItem(STORAGE_KEY) === "true";

    if (!dismissed) {
      setIsVisible(true);
    }
  }, [isLoaded, isSignedIn]);

  const dismiss = useCallback(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, "true");
    }
    setIsVisible(false);
    onClose();
  }, [onClose]);

  return { isVisible, dismiss };
}
