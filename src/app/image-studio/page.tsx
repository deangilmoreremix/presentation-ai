"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ImageStudio } from "@/components/image/ImageStudio";
import { ImageEditor } from "@/components/image/ImageEditor";
import { useState } from "react";

export default function ImageStudioPage() {
  const [currentTab, setCurrentTab] = useState<"generate" | "edit">("generate");

  useEffect(() => {
    const syncTab = () => {
      const url = new URL(window.location.href);
      setCurrentTab(url.searchParams.get("tab") === "edit" ? "edit" : "generate");
    };
    syncTab();
    window.addEventListener("popstate", syncTab);
    return () => window.removeEventListener("popstate", syncTab);
  }, []);

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
      <div className="flex-1">{currentTab === "edit" ? <ImageEditor /> : <ImageStudio />}</div>
    </div>
  );
}