"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ImageStudio } from "@/components/image/ImageStudio";
import { ImageEditor } from "@/components/image/ImageEditor";

export default function ImageStudioPage() {
  const [currentTab, setCurrentTab] = useState<"generate" | "edit">("generate");
  const [isOnboardingDismissed, setIsOnboardingDismissed] = useState(false);

  useEffect(() => {
    const syncTab = () => {
      const url = new URL(window.location.href);
      setCurrentTab(url.searchParams.get("tab") === "edit" ? "edit" : "generate");
    };
    syncTab();
    window.addEventListener("popstate", syncTab);
    return () => window.removeEventListener("popstate", syncTab);
  }, []);

  useEffect(() => {
    const dismissed = localStorage.getItem(
      "smart-presentations-onboarding-image-studio-dismissed"
    );
    if (dismissed === "true") {
      setIsOnboardingDismissed(true);
    }
  }, []);

  const handleDismissOnboarding = () => {
    localStorage.setItem("smart-presentations-onboarding-image-studio-dismissed", "true");
    setIsOnboardingDismissed(true);
  };

  const handleTryIt = () => {
    const textarea = document.getElementById("prompt") as HTMLTextAreaElement | null;
    textarea?.focus();
  };

  const switchTab = (newTab: "generate" | "edit") => {
    setCurrentTab(newTab);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", newTab);
    window.history.pushState({}, "", url);
  };

  return (
    <div className="flex flex-col h-screen">
      <div className="border-b px-4 py-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">AI Image Studio</h1>
            <p className="text-sm text-muted-foreground">
              Generate and edit images with OpenAI&apos;s latest models
            </p>
          </div>
          <div className="flex gap-2" role="tablist" aria-label="Studio tabs">
            <Button
              variant={currentTab === "generate" ? "default" : "outline"}
              size="sm"
              onClick={() => switchTab("generate")}
              role="tab"
              aria-selected={currentTab === "generate"}
            >
              Generate
            </Button>
            <Button
              variant={currentTab === "edit" ? "default" : "outline"}
              size="sm"
              onClick={() => switchTab("edit")}
              role="tab"
              aria-selected={currentTab === "edit"}
            >
              Edit
            </Button>
          </div>
        </div>
      </div>
      {!isOnboardingDismissed && (
        <div className="mx-4 mt-4 rounded-lg border bg-background/95 p-4 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Welcome to Image Studio</h2>
              <p className="text-sm text-muted-foreground">
                Generate AI images or edit existing ones. Switch between the Generate and Edit tabs to get started.
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleTryIt}>Try it</Button>
              <Button size="sm" variant="outline" onClick={handleDismissOnboarding}>Dismiss</Button>
            </div>
          </div>
        </div>
      )}
      <div className="flex-1">{currentTab === "edit" ? <ImageEditor /> : <ImageStudio />}</div>
    </div>
  );
}