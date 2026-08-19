"use client";

import { ChevronRight, LayoutGrid, Search } from "lucide-react";
import { motion } from "motion/react";
import { useMemo, useState } from "react";

import { ScrollArea } from "@/components/ui/scroll-area";
import { useMediaQuery } from "@/hooks/globals/useMediaQuery";
import { cn } from "@/lib/utils";
import {
  TEMPLATE_CATEGORIES,
  TEMPLATE_DEFINITIONS,
  type TemplateDefinition,
} from "../notebook/presentation/utils/templates";
import LazyPreview from "../notebook/presentation/utils/LazyPreview";
import { useTemplatePresentationCreator } from "@/hooks/presentation/useTemplatePresentationCreator";

interface TemplateCardProps {
  template: TemplateDefinition;
  onClick: () => void;
}

function TemplateCard({ template, onClick }: TemplateCardProps) {
  return (
    <motion.button
      onClick={onClick}
      className="group flex flex-col gap-2 text-left"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="aspect-4/3 w-full overflow-hidden rounded-lg border border-border bg-card shadow transition-all group-hover:border-primary/50 group-hover:shadow-md">
        <LazyPreview name={template.preview} />
      </div>
      <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground">
        {template.name}
      </span>
    </motion.button>
  );
}

interface TemplateLibraryProps {
  isSidebarVisible?: boolean;
}

export function TemplateLibrary({ isSidebarVisible }: TemplateLibraryProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const { createFromTemplate, isCreating } = useTemplatePresentationCreator();

  const filteredTemplates = useMemo(() => {
    const q = query.trim().toLowerCase();
    const byCategory = selectedCategory
      ? TEMPLATE_DEFINITIONS.filter((t) => t.categoryId === selectedCategory)
      : TEMPLATE_DEFINITIONS;
    if (!q) return byCategory;
    return byCategory.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q) ||
        (TEMPLATE_CATEGORIES.find((c) => c.id === t.categoryId)?.name ?? "")
          .toLowerCase()
          .includes(q),
    );
  }, [selectedCategory, query]);

  const getTemplatesByCategory = (categoryId: string) =>
    TEMPLATE_DEFINITIONS.filter((t) => t.categoryId === categoryId);

  const renderTemplateGrid = (templates: TemplateDefinition[]) => (
    <div className="grid grid-cols-2 gap-3 p-1 sm:grid-cols-3 lg:grid-cols-4 lg:gap-4">
      {templates.map((template) => (
        <TemplateCard
          key={template.id}
          template={template}
          onClick={() => {
            if (isCreating) return;
            void createFromTemplate(template);
          }}
        />
      ))}
    </div>
  );

  return (
    <>
      {isDesktop ? (
        <div className="flex h-[70vh]">
          {isSidebarVisible && (
            <div className="w-56 border-r bg-muted/30">
              <ScrollArea className="h-full p-3">
                <button
                  type="button"
                  onClick={() => setSelectedCategory(null)}
                  className={cn(
                    "mb-1 flex w-full items-center gap-2 rounded-lg p-4 text-sm transition-colors",
                    selectedCategory === null
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted",
                  )}
                >
                  <LayoutGrid className="size-4" />
                  <span>All Templates</span>
                </button>
                {TEMPLATE_CATEGORIES.map((category) => (
                  <button
                    type="button"
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg p-4 text-sm transition-colors",
                      selectedCategory === category.id
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {category.icon}
                      <span>{category.name}</span>
                    </div>
                    <ChevronRight className="size-3" />
                  </button>
                ))}
              </ScrollArea>
            </div>
          )}

          <ScrollArea className="flex-1 p-6">
            <div className="mb-4 flex items-center gap-2 rounded-lg border bg-background px-3 py-2">
              <Search className="size-4 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search templates"
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            {selectedCategory === null ? (
              <div className="space-y-8 p-1">
                {TEMPLATE_CATEGORIES.map((category) => {
                  const categoryTemplates = getTemplatesByCategory(
                    category.id,
                  );
                  if (categoryTemplates.length === 0) return null;
                  return (
                    <section key={category.id}>
                      <div className="mb-3 flex items-center gap-2">
                        {category.icon}
                        <h3 className="text-sm font-medium">
                          {category.name}
                        </h3>
                      </div>
                      {renderTemplateGrid(categoryTemplates)}
                    </section>
                  );
                })}
              </div>
            ) : (
              renderTemplateGrid(filteredTemplates)
            )}
          </ScrollArea>
        </div>
      ) : (
        <div className="flex max-h-[calc(92dvh-4.5rem)] flex-col">
          <ScrollArea className="border-b">
            <div className="flex gap-2 px-4 py-3">
              <button
                type="button"
                onClick={() => setSelectedCategory(null)}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-sm transition-colors",
                  selectedCategory === null
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background hover:bg-muted",
                )}
              >
                <LayoutGrid className="size-4" />
                <span>All Templates</span>
              </button>
              {TEMPLATE_CATEGORIES.map((category) => (
                <button
                  type="button"
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={cn(
                    "flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-sm transition-colors",
                    selectedCategory === category.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background hover:bg-muted",
                  )}
                >
                  {category.icon}
                  <span>{category.name}</span>
                </button>
              ))}
            </div>
          </ScrollArea>

          <ScrollArea className="flex-1 p-4">
            <div className="mb-4 flex items-center gap-2 rounded-lg border bg-background px-3 py-2">
              <Search className="size-4 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search templates"
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            {selectedCategory === null ? (
              <div className="space-y-6">
                {TEMPLATE_CATEGORIES.map((category) => {
                  const categoryTemplates = getTemplatesByCategory(
                    category.id,
                  );
                  if (categoryTemplates.length === 0) return null;
                  return (
                    <section key={category.id}>
                      <div className="mb-3 flex items-center gap-2">
                        {category.icon}
                        <h3 className="text-sm font-medium">
                          {category.name}
                        </h3>
                      </div>
                      {renderTemplateGrid(categoryTemplates)}
                    </section>
                  );
                })}
              </div>
            ) : (
              renderTemplateGrid(filteredTemplates)
            )}
          </ScrollArea>
        </div>
      )}
    </>
  );
}
