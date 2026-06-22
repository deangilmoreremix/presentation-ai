"use client";

import {
  BookOpen,
  ChevronsUpDownIcon,
  FileSearch,
  Loader2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";

type DocumentSearchResult = {
  chunkIds?: string[];
  content?: string;
  fileName?: string;
  page?: number | null;
};

type DocumentLoadedPage = {
  chunkIds?: string[];
  content?: string;
  page?: number;
};

const EMPTY_DOCUMENT_SEARCH_RESULTS: DocumentSearchResult[] = [];
const EMPTY_DOCUMENT_PAGES: DocumentLoadedPage[] = [];

function stripChunkTags(content: string): string {
  return content
    .replace(/<c\b[^>]*>/gi, "")
    .replace(/<\/c>/gi, "")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, (_match, altText: string) =>
      altText.trim().length > 0 ? altText : "Image",
    )
    .replace(/&amp;/g, "&")
    .trim();
}

function getDocumentSearchResultTitle(
  result: DocumentSearchResult,
  index: number,
): string {
  const titleParts = [
    result.fileName?.trim() || `Result ${index + 1}`,
    typeof result.page === "number" ? `Page ${result.page}` : null,
  ].filter((part): part is string => typeof part === "string");

  return titleParts.join(" - ");
}

function getPageRangeLabel({
  endPage,
  page,
  pageCount,
  startPage,
}: {
  endPage?: number;
  page?: number;
  pageCount?: number | null;
  startPage?: number;
}): string | null {
  const resolvedStartPage =
    typeof page === "number"
      ? page
      : typeof startPage === "number"
        ? startPage
        : null;
  const resolvedEndPage =
    typeof page === "number"
      ? page
      : typeof endPage === "number"
        ? endPage
        : resolvedStartPage;

  if (
    typeof resolvedStartPage !== "number" ||
    typeof resolvedEndPage !== "number"
  ) {
    return null;
  }

  const rangeLabel =
    resolvedStartPage === resolvedEndPage
      ? `Page ${resolvedStartPage}`
      : `Pages ${resolvedStartPage}-${resolvedEndPage}`;

  if (
    typeof pageCount === "number" &&
    pageCount > 0 &&
    resolvedStartPage === resolvedEndPage
  ) {
    return `${rangeLabel} of ${pageCount}`;
  }

  return rangeLabel;
}

export function DocumentSearchLoading({ query }: { query?: string }) {
  return (
    <div
      className="mb-2 w-full rounded-lg border border-primary/20 bg-background"
      aria-label={
        query ? `Searching attached documents for ${query}` : undefined
      }
    >
      <div className="flex h-12 items-center gap-3 px-4 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            Searching attached documents...
          </p>
        </div>
      </div>
    </div>
  );
}

export function DocumentSearchResultCard({
  message,
  query,
  results = EMPTY_DOCUMENT_SEARCH_RESULTS,
}: {
  message?: string;
  query?: string;
  results?: DocumentSearchResult[];
}) {
  return (
    <Collapsible
      className="mb-2 w-full rounded-lg border border-primary/20 bg-background"
      aria-label={query ? `Document searched for ${query}` : undefined}
    >
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="h-12 w-full justify-between px-4">
          <div className="flex w-[90%] min-w-0 items-center gap-3">
            <FileSearch className="size-5 shrink-0" />
            <div className="flex min-w-0 flex-col items-start overflow-hidden">
              <span className="w-full truncate text-sm font-medium">
                Document searched
              </span>
              <span className="text-xs text-muted-foreground">
                {results.length} result{results.length === 1 ? "" : "s"} found
              </span>
            </div>
          </div>
          <ChevronsUpDownIcon className="size-5 shrink-0 transition-transform duration-300 data-[state=open]:rotate-180" />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="grid max-w-full grid-cols-1 gap-y-2 p-4">
        {message ? (
          <p className="text-xs text-muted-foreground">{message}</p>
        ) : null}
        {results.map((result, index) => {
          const content = stripChunkTags(result.content ?? "");

          return (
            <div
              key={`${result.fileName ?? "document"}-${result.page ?? "na"}-${index}`}
              className="flex max-w-full items-start gap-3 rounded-lg border border-primary/20 p-3"
            >
              <FileSearch className="mt-1 size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1 overflow-hidden">
                <h4 className="truncate text-sm font-medium">
                  {getDocumentSearchResultTitle(result, index)}
                </h4>
                <p className="line-clamp-2 text-xs text-muted-foreground">
                  {content || "No excerpt was returned."}
                </p>
              </div>
            </div>
          );
        })}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function DocumentPageLoading({
  endPage,
  page,
  startPage,
}: {
  endPage?: number;
  page?: number;
  startPage?: number;
}) {
  const pageLabel =
    getPageRangeLabel({ endPage, page, startPage }) ?? "document page";

  return (
    <div className="mb-2 w-full rounded-lg border border-primary/20 bg-background">
      <div className="flex h-12 items-center gap-3 px-4 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            Loading {pageLabel.toLowerCase()}
          </p>
        </div>
      </div>
    </div>
  );
}

export function DocumentPageResultCard({
  content,
  error,
  endPage,
  fileName,
  message,
  page,
  pages = EMPTY_DOCUMENT_PAGES,
  pageCount,
  startPage,
}: {
  content?: string;
  error?: boolean;
  endPage?: number;
  fileName?: string;
  message?: string;
  page?: number;
  pages?: DocumentLoadedPage[];
  pageCount?: number | null;
  startPage?: number;
}) {
  const pageLabel = getPageRangeLabel({
    endPage,
    page,
    pageCount,
    startPage,
  });
  const resolvedPages = pages.filter(
    (
      loadedPage,
    ): loadedPage is Required<Pick<DocumentLoadedPage, "content" | "page">> &
      DocumentLoadedPage =>
      typeof loadedPage.page === "number" &&
      typeof loadedPage.content === "string" &&
      loadedPage.content.trim().length > 0,
  );

  return (
    <div className="mb-3 w-full rounded-lg border border-primary/20 bg-background p-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-md bg-primary/10 p-2 text-primary">
          <BookOpen className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-foreground">
              {fileName ?? "Document page"}
            </p>
            {pageLabel ? <Badge variant="secondary">{pageLabel}</Badge> : null}
          </div>
          {message ? (
            <p
              className={`mt-1 text-xs ${
                error ? "text-destructive" : "text-muted-foreground"
              }`}
            >
              {message}
            </p>
          ) : null}
          {resolvedPages.length > 1 ? (
            <ScrollArea className="mt-3 max-h-80 rounded-lg border border-border/70 bg-muted/20 p-3">
              <div className="space-y-4">
                {resolvedPages.map((loadedPage) => (
                  <section
                    key={loadedPage.page}
                    className="rounded-lg border border-border/60 bg-background/70 p-3"
                  >
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <Badge variant="outline">Page {loadedPage.page}</Badge>
                      {Array.isArray(loadedPage.chunkIds) &&
                      loadedPage.chunkIds.length > 0 ? (
                        <Badge variant="outline">
                          {loadedPage.chunkIds.join(", ")}
                        </Badge>
                      ) : null}
                    </div>
                    <pre className="whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
                      {loadedPage.content}
                    </pre>
                  </section>
                ))}
              </div>
            </ScrollArea>
          ) : content?.trim() ? (
            <ScrollArea className="mt-3 max-h-80 rounded-lg border border-border/70 bg-muted/20 p-3">
              <pre className="whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
                {content}
              </pre>
            </ScrollArea>
          ) : null}
          {!content?.trim() && !message ? (
            <p className="mt-3 text-xs text-muted-foreground">
              No page content was returned.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
