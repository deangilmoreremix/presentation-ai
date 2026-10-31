"use client";

import { useState } from "react";
import { useMediaQuery } from "@/hooks/globals/useMediaQuery";
import { Button } from "@/components/ui/button";
import {
  Credenza,
  CredenzaContent,
  CredenzaHeader,
  CredenzaTitle,
} from "@/components/ui/credenza";
import { usePresentationState } from "@/states/presentation-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FreePptTemplateGallery } from "@/components/templates/FreePptTemplateGallery";
import { TemplateLibrary } from "@/components/templates/TemplateLibrary";

export function PresentationTemplates() {
  const { showTemplates, setShowTemplates } = usePresentationState();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);

  return (
    <Credenza open={showTemplates} onOpenChange={setShowTemplates}>
      <CredenzaContent
        shouldHaveClose={false}
        className="max-h-[92dvh] max-w-250 gap-0 overflow-hidden p-0"
      >
        <CredenzaHeader className="flex flex-row items-center justify-between border-b p-4 sm:px-6">
          <div className="flex items-center gap-3">
            {isDesktop && (
              <Button
                onClick={() => setIsSidebarVisible(!isSidebarVisible)}
                variant="ghost"
                size="icon"
                className="size-8"
              >
                <span className="sr-only">Toggle sidebar</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-4"
                >
                  <rect width="7" height="7" x="3" y="3" rx="1" />
                  <rect width="7" height="7" x="14" y="3" rx="1" />
                  <rect width="7" height="7" x="14" y="14" rx="1" />
                  <rect width="7" height="7" x="3" y="14" rx="1" />
                </svg>
              </Button>
            )}
            <CredenzaTitle>Templates</CredenzaTitle>
          </div>
          <Button
            onClick={() => setShowTemplates(false)}
            variant="ghost"
            size="icon"
            className="size-8"
          >
            <span className="sr-only">Close</span>
            <span aria-hidden>×</span>
          </Button>
        </CredenzaHeader>
        <Tabs defaultValue="layouts" className="gap-0">
          <TabsList className="mx-4 mt-3 w-fit sm:mx-6">
            <TabsTrigger value="layouts">Smart Layouts</TabsTrigger>
            <TabsTrigger value="free-ppt">Free PPT Templates</TabsTrigger>
          </TabsList>
          <TabsContent value="layouts">
            <TemplateLibrary isSidebarVisible={isSidebarVisible} />
          </TabsContent>
          <TabsContent
            value="free-ppt"
            className="max-h-[calc(92dvh-8rem)] overflow-y-auto"
          >
            <FreePptTemplateGallery />
          </TabsContent>
        </Tabs>
      </CredenzaContent>
    </Credenza>
  );
}
