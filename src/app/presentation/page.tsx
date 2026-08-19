"use client";

import { PresentationDashboard } from "@/components/notebook/presentation/components/PresentationDashboard";
import { WelcomeOverlay } from "@/components/onboarding/WelcomeOverlay";
import { useWelcomeOverlay } from "@/hooks/onboarding/useWelcomeOverlay";

export default function PresentationPage() {
  const { dismiss } = useWelcomeOverlay(() => {
    // onClose callback - overlay dismissed
  });

  return (
    <>
      <WelcomeOverlay onClose={dismiss} />
      <PresentationDashboard />
    </>
  );
}
