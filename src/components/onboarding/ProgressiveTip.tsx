"use client";

import { useEffect, useId, useRef, useState } from "react";

const ONBOARDING_STORAGE_PREFIX = "smart-presentations-onboarding-tip-";
const AUTO_DISMISS_MS = 8_000;

type ProgressiveTipProps = {
  id: string;
  message: string;
  targetElementRef?: React.RefObject<HTMLElement | null>;
  onDismiss?: (id: string) => void;
};

export function ProgressiveTip({
  id,
  message,
  targetElementRef,
  onDismiss,
}: ProgressiveTipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const tipRef = useRef<HTMLDivElement | null>(null);
  const generatedId = useId();
  const tipKey = `${ONBOARDING_STORAGE_PREFIX}${id}`;

  useEffect(() => {
    if (typeof window === "undefined") return;

    const hasSeenTip = window.localStorage.getItem(tipKey);
    if (hasSeenTip === "true") {
      setIsDismissed(true);
      return;
    }

    setIsVisible(true);

    const timeout = setTimeout(() => {
      handleDismiss();
    }, AUTO_DISMISS_MS);

    return () => clearTimeout(timeout);
  }, [tipKey]);

  const handleDismiss = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(tipKey, "true");
    }
    setIsVisible(false);
    onDismiss?.(id);
  };

  if (isDismissed || !isVisible) return null;

  const isPositioned = !!targetElementRef?.current;
  const containerStyle: React.CSSProperties = isPositioned
    ? {}
    : {
        position: "fixed",
        bottom: "1.5rem",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
      };

  return (
    <div
      ref={tipRef}
      style={containerStyle}
      className="w-full max-w-sm px-4 sm:w-auto"
    >
      <div
        className={`
          flex items-center gap-3 rounded-full px-4 py-2 shadow-lg
          border border-border/60 bg-background/95
          text-sm text-foreground backdrop-blur
          dark:bg-background/90 dark:border-border/40
        `}
      >
        <span className="flex-1 leading-snug">{message}</span>
        <button
          type="button"
          onClick={handleDismiss}
          className="
            flex size-6 shrink-0 items-center justify-center
            rounded-full text-muted-foreground transition-colors
            hover:bg-muted hover:text-foreground
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
          "
          aria-label={`Dismiss tip: ${message}`}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M2.5 2.5L9.5 9.5M9.5 2.5L2.5 9.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
