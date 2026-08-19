"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const ONBOARDING_STORAGE_PREFIX = "smart-presentations-onboarding-tip-";
const AUTO_DISMISS_MS = 8_000;

type UseProgressiveTipsOptions = {
  id: string;
  message: string;
  autoDismissMs?: number;
};

type UseProgressiveTipsReturn = {
  showTip: boolean;
  dismissTip: () => void;
};

export function useProgressiveTips({
  id,
  message,
  autoDismissMs = AUTO_DISMISS_MS,
}: UseProgressiveTipsOptions): UseProgressiveTipsReturn {
  const [showTip, setShowTip] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tipKey = `${ONBOARDING_STORAGE_PREFIX}${id}`;

  const dismissTip = useCallback(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(tipKey, "true");
    }
    setShowTip(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, [tipKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const hasSeenTip = window.localStorage.getItem(tipKey);
    if (hasSeenTip === "true") {
      setShowTip(false);
      return;
    }

    setShowTip(true);

    timeoutRef.current = setTimeout(() => {
      dismissTip();
    }, autoDismissMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [id, message, autoDismissMs, dismissTip, tipKey]);

  return { showTip, dismissTip };
}
