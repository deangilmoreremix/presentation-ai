"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { ProgressiveTip } from "@/components/onboarding/ProgressiveTip";
import { useProgressiveTips } from "@/hooks/onboarding/useProgressiveTips";

type TipEntry = {
  id: string;
  message: string;
};

type TipContextValue = {
  showTip: (id: string, message: string) => void;
  dismissTip: (id: string) => void;
  activeTips: TipEntry[];
};

const TipContext = createContext<TipContextValue | null>(null);

type TipProviderProps = {
  children: ReactNode;
};

export function TipProvider({ children }: TipProviderProps) {
  const [activeTips, setActiveTips] = useState<TipEntry[]>([]);

  const showTip = useCallback((id: string, message: string) => {
    setActiveTips((prev) => {
      if (prev.some((tip) => tip.id === id)) {
        return prev;
      }
      return [...prev, { id, message }];
    });
  }, []);

  const dismissTip = useCallback((id: string) => {
    setActiveTips((prev) => prev.filter((tip) => tip.id !== id));
  }, []);

  const value = useMemo(
    () => ({
      showTip,
      dismissTip,
      activeTips,
    }),
    [activeTips, dismissTip, showTip],
  );

  return (
    <TipContext.Provider value={value}>
      {children}
      <div className="fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4 pointer-events-none">
        {activeTips.map((tip) => (
          <div key={tip.id} className="pointer-events-auto w-full max-w-sm">
            <ProgressiveTip
              id={tip.id}
              message={tip.message}
              onDismiss={dismissTip}
            />
          </div>
        ))}
      </div>
    </TipContext.Provider>
  );
}

export function useTipRegistry() {
  const context = useContext(TipContext);
  if (!context) {
    throw new Error("useTipRegistry must be used within a TipProvider");
  }
  return context;
}
