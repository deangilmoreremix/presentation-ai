import { useState, useCallback } from "react";

const STORAGE_KEY = "smart-presentations-onboarding-editor-tour-dismissed";

export function useEditorTour() {
  const [isVisible, setIsVisible] = useState(() => {
    if (typeof window === "undefined") return false;
    return !localStorage.getItem(STORAGE_KEY);
  });

  const [currentStep, setCurrentStep] = useState(0);

  const nextStep = useCallback(() => {
    setCurrentStep((prev) => prev + 1);
  }, []);

  const dismiss = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "true");
    setIsVisible(false);
  }, []);

  return { isVisible, currentStep, nextStep, dismiss };
}
