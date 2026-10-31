"use client";

import {
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  LayoutGrid,
  Loader2,
  Search,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTemplatePresentationCreator } from "@/hooks/presentation/useTemplatePresentationCreator";
import {
  FREE_PPT_TEMPLATE_SOURCE_URL,
  getFreePptCategories,
  getFreePptCoverUrl,
  getFreePptPptxUrl,
  getFreePptPreviewUrls,
  loadFreePptTemplates,
  searchFreePptTemplates,
  type FreePptTemplate,
} from "@/lib/presentation/free-ppt-templates";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 48;

export function FreePptTemplateGallery() {
  const [templates, setTemplates] = useState<FreePptTemplate[] | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [selected, setSelected] = useState<FreePptTemplate | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadFreePptTemplates().then((list) => {
      if (!cancelled) setTemplates(list);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const categories = useMemo(
    () => (templates ? getFreePptCategories(templates) : []),
    [templates],
  );
  const results = useMemo(
    () => (templates ? searchFreePptTemplates(templates, query, category) : []),
    [templates, query, category],
  );

  // Reset paging whenever the filter changes.
  useEffect(() => setVisible(PAGE_SIZE), [query, category]);

  if (!templates) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 size-4 animate-spin" />
        Loading templates…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2">
        <Search className="size-4 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${templates.length} free templates (e.g. "pitch deck blue")`}
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <CategoryChip
          active={category === null}
          onClick={() => setCategory(null)}
          label="All"
          count={templates.length}
          icon={<LayoutGrid className="size-3.5" />}
        />
        {categories.map((c) => (
          <CategoryChip
            key={c.id}
            active={category === c.id}
            onClick={() => setCategory(c.id)}
            label={c.name}
            count={c.count}
          />
        ))}
      </div>

      {results.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">
          No templates match your search.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {results.slice(0, visible).map((t) => (
            <button
              type="button"
              key={t.slug}
              onClick={() => setSelected(t)}
              className="group flex flex-col gap-2 text-left"
            >
              <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-border bg-muted shadow transition-all group-hover:border-primary/50 group-hover:shadow-md">
                <img
                  src={getFreePptCoverUrl(t)}
                  alt={t.title}
                  loading="lazy"
                  decoding="async"
                  className="size-full object-cover transition-transform group-hover:scale-[1.03]"
                />
                <span className="absolute right-1.5 bottom-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                  {t.slideCount} slides
                </span>
              </div>
              <span className="line-clamp-2 text-xs font-medium text-muted-foreground group-hover:text-foreground">
                {t.title}
              </span>
            </button>
          ))}
        </div>
      )}

      {visible < results.length && (
        <Button
          variant="outline"
          className="self-center"
          onClick={() => setVisible((v) => v + PAGE_SIZE)}
        >
          Show more ({results.length - visible} remaining)
        </Button>
      )}

      <p className="text-center text-xs text-muted-foreground">
        Templates from{" "}
        <a
          href={FREE_PPT_TEMPLATE_SOURCE_URL}
          target="_blank"
          rel="noreferrer"
          className="underline"
        >
          free-ppt-template
        </a>{" "}
        by ppttemplate.ai, licensed CC BY 4.0.
      </p>

      <FreePptTemplatePreviewDialog
        template={selected}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}

function CategoryChip({
  active,
  onClick,
  label,
  count,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background hover:bg-muted",
      )}
    >
      {icon}
      {label}
      <span className="opacity-60">{count}</span>
    </button>
  );
}

function FreePptTemplatePreviewDialog({
  template,
  onClose,
}: {
  template: FreePptTemplate | null;
  onClose: () => void;
}) {
  const [page, setPage] = useState(0);
  const { createFromFreePptTemplate, isCreating } =
    useTemplatePresentationCreator();

  useEffect(() => setPage(0), [template?.slug]);

  const previews = template ? getFreePptPreviewUrls(template) : [];

  return (
    <Dialog open={template !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl">
        {template && (
          <>
            <DialogHeader>
              <DialogTitle>{template.title}</DialogTitle>
              <DialogDescription>{template.description}</DialogDescription>
            </DialogHeader>

            <div className="relative aspect-video w-full overflow-hidden rounded-lg border bg-muted">
              <img
                src={previews[page]}
                alt={`${template.title} — slide ${page + 1}`}
                className="size-full object-contain"
              />
              {previews.length > 1 && (
                <>
                  <Button
                    size="icon"
                    variant="secondary"
                    className="absolute top-1/2 left-2 -translate-y-1/2"
                    disabled={page === 0}
                    onClick={() => setPage((p) => p - 1)}
                    aria-label="Previous slide"
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="secondary"
                    className="absolute top-1/2 right-2 -translate-y-1/2"
                    disabled={page === previews.length - 1}
                    onClick={() => setPage((p) => p + 1)}
                    aria-label="Next slide"
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </>
              )}
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
              {previews.map((src, i) => (
                <button
                  type="button"
                  key={src}
                  onClick={() => setPage(i)}
                  className={cn(
                    "aspect-video w-24 shrink-0 overflow-hidden rounded border-2",
                    i === page ? "border-primary" : "border-transparent",
                  )}
                >
                  <img
                    src={src}
                    alt={`Slide ${i + 1}`}
                    className="size-full object-cover"
                  />
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="secondary">{template.categoryName}</Badge>
              {template.tags.slice(0, 6).map((tag) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="ghost" asChild>
                <a
                  href={`https://ppttemplate.ai/templates/${template.slug}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink className="mr-2 size-4" />
                  View source
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a href={getFreePptPptxUrl(template)} download>
                  <Download className="mr-2 size-4" />
                  Download .pptx
                </a>
              </Button>
              <Button
                disabled={isCreating}
                onClick={() => void createFromFreePptTemplate(template)}
              >
                {isCreating ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 size-4" />
                )}
                Use template ({template.slideCount} slides)
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
