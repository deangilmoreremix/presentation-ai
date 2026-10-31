"use client";

import { useState } from "react";
import { LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Navigation } from "@/components/navigation/Navigation";
import { FreePptTemplateGallery } from "@/components/templates/FreePptTemplateGallery";
import { TemplateLibrary } from "@/components/templates/TemplateLibrary";

export default function TemplatesPage() {
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <Navigation />

      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">Presentation Templates</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Start from a smart layout or one of 595 free designer decks. Click any template to start creating.
            </p>
          </div>

          <Tabs defaultValue="free-ppt">
            <TabsList className="mx-auto mb-4 flex w-fit">
              <TabsTrigger value="free-ppt">Free PPT Templates</TabsTrigger>
              <TabsTrigger value="layouts">Smart Layouts</TabsTrigger>
            </TabsList>

            <TabsContent value="free-ppt">
              <div className="rounded-2xl border border-border/60 bg-background/80 shadow-lg overflow-hidden">
                <FreePptTemplateGallery />
              </div>
            </TabsContent>

            <TabsContent value="layouts">
              <div className="flex items-center gap-2 mb-4">
                <Button
                  onClick={() => setIsSidebarVisible(!isSidebarVisible)}
                  variant="outline"
                  size="icon"
                  className="size-8"
                >
                  <LayoutGrid className="size-4" />
                </Button>
              </div>

              <div className="rounded-2xl border border-border/60 bg-background/80 shadow-lg overflow-hidden">
                <TemplateLibrary isSidebarVisible={isSidebarVisible} />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </div>
  );
}
