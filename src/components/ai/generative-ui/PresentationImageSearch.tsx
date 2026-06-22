"use client";

import { ChevronDown, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  type PresentationImageSearchResult,
  type PresentationImageSearchResultItem,
} from "@/lib/presentation/image-search";
import { cn } from "@/lib/utils";

function getImageCardKey(image: PresentationImageSearchResultItem): string {
  return [image.url, image.sourceUrl ?? "", image.sourceTitle ?? ""].join("|");
}

function flattenImageResults(
  searches: PresentationImageSearchResult[],
  failedUrls: Set<string>,
): PresentationImageSearchResultItem[] {
  const seenUrls = new Set<string>();

  return searches.flatMap((search) =>
    search.results.filter((image) => {
      if (failedUrls.has(image.url) || seenUrls.has(image.url)) {
        return false;
      }

      seenUrls.add(image.url);
      return true;
    }),
  );
}

export function PresentationImageSearchActivityCard({
  autoExpand = false,
  searches,
  pendingQueries = [],
}: {
  autoExpand?: boolean;
  searches: PresentationImageSearchResult[];
  pendingQueries?: string[];
}) {
  const [isExpanded, setIsExpanded] = useState(autoExpand);
  const [failedUrls, setFailedUrls] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] =
    useState<PresentationImageSearchResultItem | null>(null);
  const failedUrlSet = useMemo(() => new Set(failedUrls), [failedUrls]);

  const allQueries = useMemo(() => {
    const seen = new Set<string>();
    return [...searches.map((s) => s.query), ...pendingQueries].filter((q) => {
      if (seen.has(q)) return false;
      seen.add(q);
      return true;
    });
  }, [searches, pendingQueries]);

  const images = useMemo(
    () => flattenImageResults(searches, failedUrlSet),
    [searches, failedUrlSet],
  );

  const hasPendingSearches = pendingQueries.length > 0;
  const hasContent =
    allQueries.length > 0 || images.length > 0 || hasPendingSearches;

  if (!hasContent) {
    return null;
  }

  const blockLabel =
    hasPendingSearches && images.length === 0
      ? "Searching images..."
      : "Image Result";

  return (
    <>
      <div>
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className="inline-flex max-w-full min-w-0 items-center gap-1.5 overflow-hidden text-left text-sm text-muted-foreground/80 transition-colors hover:text-muted-foreground"
        >
          <span className="truncate whitespace-nowrap font-medium">
            {blockLabel}
          </span>
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 shrink-0 transition-transform duration-200",
              isExpanded && "rotate-180",
            )}
          />
        </button>

        {isExpanded ? (
          <div className="relative mt-2 ml-1 pl-4 before:absolute before:top-0 before:left-0 before:h-full before:w-px before:bg-border/50">
            <div className="space-y-2">
              {allQueries.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {allQueries.map((query) => (
                    <span
                      key={query}
                      className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-muted/30 px-2 py-0.5 text-[11px] text-muted-foreground"
                    >
                      {pendingQueries.includes(query) ? (
                        <Loader2 className="h-2.5 w-2.5 animate-spin" />
                      ) : null}
                      <span className="max-w-48 truncate">{query}</span>
                    </span>
                  ))}
                </div>
              ) : null}

              {images.length > 0 ? (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
                  {images.map((image) => (
                    <button
                      type="button"
                      key={getImageCardKey(image)}
                      className="overflow-hidden rounded-md bg-muted/30"
                      onClick={() => setSelectedImage(image)}
                    >
                      {/* biome-ignore lint/performance/noImgElement: external image search results need plain img tags */}
                      <img
                        src={image.url}
                        alt={image.description}
                        className="aspect-4/3 w-full object-cover transition-opacity hover:opacity-90"
                        loading="lazy"
                        onError={() =>
                          setFailedUrls((cur) =>
                            cur.includes(image.url) ? cur : [...cur, image.url],
                          )
                        }
                      />
                    </button>
                  ))}
                </div>
              ) : hasPendingSearches ? (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div
                      key={i}
                      className="aspect-4/3 w-full animate-pulse rounded-md bg-muted/40"
                    />
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      <Dialog
        open={selectedImage !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedImage(null);
          }
        }}
      >
        <DialogContent
          className="max-w-[min(96vw,72rem)] border-border/60 bg-background/95 p-2"
          shouldHaveClose={false}
        >
          <DialogTitle className="sr-only">Expanded image preview</DialogTitle>
          {selectedImage ? (
            <div className="overflow-hidden rounded-md">
              {/* biome-ignore lint/performance/noImgElement: external image search results need plain img tags */}
              <img
                src={selectedImage.url}
                alt={selectedImage.description}
                className="max-h-[85vh] w-full object-contain"
              />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
