"use client";

import {
  CheckCircle2,
  CircleAlert,
  FileText,
  Loader2,
  Search,
} from "lucide-react";
import { Fragment, useMemo, useState, type ReactNode } from "react";

import {
  DocumentPageLoading,
  DocumentPageResultCard,
  DocumentSearchLoading,
  DocumentSearchResultCard,
} from "@/components/ai/generative-ui/DocumentTools";
import { PresentationImageSearchActivityCard } from "@/components/ai/generative-ui/PresentationImageSearch";
import {
  Searched,
  Searching,
  type SearchResult,
} from "@/components/ai/generative-ui/Searched";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  isPresentationImageSearchToolName,
  isWebSearchToolName,
} from "@/lib/ai/tool-names";
import {
  isNotebookAgentActivityEvent,
  NOTEBOOK_AGENT_ACTIVITY_TOOL_NAMES,
  parseNotebookAgentToolResult,
  type NotebookAgentSelectedChunk,
  type NotebookAgentToolCall,
} from "@/lib/notebook/agent-activity";
import {
  parsePresentationImageSearchPayload,
  type PresentationImageSearchResult,
} from "@/lib/presentation/image-search";

const ACTIVITY_LABELS: Record<string, string> = {
  [NOTEBOOK_AGENT_ACTIVITY_TOOL_NAMES.USER_INPUT]: "User Input",
  [NOTEBOOK_AGENT_ACTIVITY_TOOL_NAMES.ASSISTANT_OUTPUT]: "Assistant Output",
  [NOTEBOOK_AGENT_ACTIVITY_TOOL_NAMES.STEP_START]: "Agent Step",
  [NOTEBOOK_AGENT_ACTIVITY_TOOL_NAMES.SOURCE]: "Source",
  [NOTEBOOK_AGENT_ACTIVITY_TOOL_NAMES.REASONING]: "Reasoning",
  [NOTEBOOK_AGENT_ACTIVITY_TOOL_NAMES.DOCUMENT_CONTEXT]: "File Processing",
  loadDocumentPage: "Document Page",
  searchDocuments: "Document Search",
  search_presentation_images: "Image Search",
};

const EMPTY_SELECTED_CHUNKS: NotebookAgentSelectedChunk[] = [];

function getActivityLabel(toolName: string): string {
  return (
    ACTIVITY_LABELS[toolName] ??
    toolName
      .replace(/^__agent\./, "")
      .replace(/[_-]+/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase())
  );
}

function isTextPreviewResult(
  value: unknown,
): value is { text: string; truncated?: boolean } {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    "text" in value &&
    typeof value.text === "string"
  );
}

function getString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function getNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isOpaqueFileIdentifier(
  fileName: string,
  ragId: string | null,
): boolean {
  if (ragId && fileName === ragId) {
    return true;
  }

  if (fileName.includes(".")) {
    return false;
  }

  return fileName.length >= 20;
}

function getFileProcessingDisplay(status: string | null): {
  icon: ReactNode;
  label: string;
  toneClassName: string;
} {
  switch (status) {
    case "COMPLETE":
      return {
        icon: <CheckCircle2 className="size-3.5" />,
        label: "Processed",
        toneClassName: "border-primary/25 bg-primary/10 text-primary",
      };
    case "ERROR":
      return {
        icon: <CircleAlert className="size-3.5" />,
        label: "Processing failed",
        toneClassName:
          "border-destructive/20 bg-destructive/10 text-destructive",
      };
    default:
      return {
        icon: <Loader2 className="size-3.5 animate-spin" />,
        label: "Processing",
        toneClassName: "border-blue-500/20 bg-blue-500/10 text-blue-500",
      };
  }
}

function renderActivityResult(
  toolName: string,
  rawResult: unknown,
  onOpenDocumentContext?: (context: {
    fileAssetId?: string;
    fileUrl?: string;
    ragId?: string;
  }) => void,
): ReactNode | null {
  if (!isNotebookAgentActivityEvent(toolName)) {
    return null;
  }

  if (toolName === NOTEBOOK_AGENT_ACTIVITY_TOOL_NAMES.DOCUMENT_CONTEXT) {
    if (!isRecord(rawResult)) {
      return null;
    }

    const rawFileName = getString(rawResult.fileName) ?? "Document";
    const fileAssetId = getString(rawResult.fileAssetId);
    const fileUrl = getString(rawResult.fileUrl);
    const ragId = getString(rawResult.ragId);
    const processingStatus = getString(rawResult.processingStatus);
    const statusDisplay = getFileProcessingDisplay(processingStatus);
    let displayFileName = rawFileName;

    if (fileUrl && isOpaqueFileIdentifier(rawFileName, ragId)) {
      try {
        const urlObj = new URL(fileUrl);
        const pathParts = urlObj.pathname.split("/");
        const lastPart = pathParts[pathParts.length - 1];
        if (lastPart && !isOpaqueFileIdentifier(lastPart, ragId)) {
          displayFileName = decodeURIComponent(lastPart);
        }
      } catch {
        // Ignore invalid URLs.
      }
    }

    if (isOpaqueFileIdentifier(displayFileName, ragId)) {
      displayFileName = "Document";
    }

    const rowContent = (
      <>
        <div className="flex min-w-0 items-center gap-2">
          <FileText className="size-4 shrink-0 text-primary/70" />
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium text-foreground/90">
              {displayFileName}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[11px] font-medium ${statusDisplay.toneClassName}`}
          >
            {statusDisplay.icon}
            {statusDisplay.label}
          </span>
          {onOpenDocumentContext || fileUrl ? (
            <span className="text-[12px] font-medium text-primary">Open</span>
          ) : null}
        </div>
      </>
    );

    if (onOpenDocumentContext) {
      return (
        <button
          type="button"
          onClick={() =>
            onOpenDocumentContext({
              fileAssetId: fileAssetId ?? undefined,
              fileUrl: fileUrl ?? undefined,
              ragId: ragId ?? undefined,
            })
          }
          className="flex w-full items-center justify-between gap-3 rounded-lg border border-primary/20 bg-background p-3 text-left text-xs text-muted-foreground transition-colors hover:bg-muted/40"
        >
          {rowContent}
        </button>
      );
    }

    if (fileUrl) {
      return (
        <a
          href={fileUrl}
          target="_blank"
          rel="noreferrer"
          className="flex w-full items-center justify-between gap-3 rounded-lg border border-primary/20 bg-background p-3 text-left text-xs text-muted-foreground transition-colors hover:bg-muted/40"
        >
          {rowContent}
        </a>
      );
    }

    return (
      <div className="flex w-full items-center justify-between gap-3 rounded-lg border border-primary/20 bg-background p-3 text-xs text-muted-foreground">
        {rowContent}
      </div>
    );
  }

  if (toolName === NOTEBOOK_AGENT_ACTIVITY_TOOL_NAMES.STEP_START) {
    if (!isRecord(rawResult)) {
      return null;
    }

    const step = getNumber(rawResult.step);
    return step === null ? null : <p className="mt-2 text-sm">Started step {step}.</p>;
  }

  if (toolName === NOTEBOOK_AGENT_ACTIVITY_TOOL_NAMES.SOURCE) {
    if (!isRecord(rawResult)) {
      return null;
    }

    const sourceType =
      getString(rawResult.sourceType) ?? getString(rawResult.type);
    const title = getString(rawResult.title);
    const url = getString(rawResult.url);

    return (
      <div className="mt-2 space-y-1 text-sm">
        {title ? <p className="font-medium text-foreground">{title}</p> : null}
        {sourceType ? (
          <p className="text-muted-foreground">Type: {sourceType}</p>
        ) : null}
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="block break-all text-blue-500 underline underline-offset-2"
          >
            Open source
          </a>
        ) : null}
      </div>
    );
  }

  return null;
}

function getQueryFromCall(call: NotebookAgentToolCall): string {
  if (typeof call.args?.query === "string") {
    return call.args.query;
  }

  const parsed = parseNotebookAgentToolResult(call.result) as
    | { query?: string }
    | undefined;
  if (typeof parsed?.query === "string") {
    return parsed.query;
  }

  return "Search";
}

function getResultsFromCall(call: NotebookAgentToolCall): unknown[] {
  const parsed = parseNotebookAgentToolResult(call.result) as
    | { results?: unknown[] }
    | undefined;

  return Array.isArray(parsed?.results) ? parsed.results : [];
}

function getImageSearchQuery(call: NotebookAgentToolCall): string {
  if (
    typeof call.args?.query === "string" &&
    call.args.query.trim().length > 0
  ) {
    return call.args.query.trim();
  }

  const parsed = parsePresentationImageSearchPayload(call.result);
  return parsed?.query ?? "Image search";
}

function getSelectedChunkLines(
  selectedChunks: NotebookAgentSelectedChunk[],
): string[] {
  return selectedChunks
    .map((chunk) => chunk.content?.trim())
    .filter(
      (content): content is string =>
        typeof content === "string" &&
        content.length > 0 &&
        !/^!\[.*\]\(.*\)$/.test(content),
    );
}

function getSelectedChunkPreviewItems(
  selectedChunks: NotebookAgentSelectedChunk[],
): Array<{ id: string; text: string }> {
  const seenCounts = new Map<string, number>();

  return getSelectedChunkLines(selectedChunks)
    .slice(0, 4)
    .map((text) => {
      const duplicateCount = seenCounts.get(text) ?? 0;
      seenCounts.set(text, duplicateCount + 1);

      return {
        id: `${text}:${duplicateCount}`,
        text,
      };
    });
}

function SelectedChunkSummary({
  selectedChunks,
}: {
  selectedChunks: NotebookAgentSelectedChunk[];
}) {
  const previewItems = getSelectedChunkPreviewItems(selectedChunks);
  if (previewItems.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border border-primary/20 bg-background p-3">
      <p className="text-[13px] font-medium text-foreground/90">
        Selected document emphasis
      </p>
      <p className="mt-1.5 text-[12px] text-muted-foreground">
        The agent should prioritize these selected excerpts.
      </p>
      <div className="mt-2 space-y-2">
        {previewItems.map((item) => (
          <p
            key={item.id}
            className="rounded-md bg-muted/40 px-2.5 py-2 text-[12px] leading-relaxed text-muted-foreground"
          >
            {item.text}
          </p>
        ))}
      </div>
    </div>
  );
}

export function NotebookAgentActivityList({
  toolCalls,
  selectedChunks = EMPTY_SELECTED_CHUNKS,
  showEmptyState = false,
  emptyLabel = "No activity yet.",
  onOpenDocumentContext,
}: {
  toolCalls: NotebookAgentToolCall[];
  selectedChunks?: NotebookAgentSelectedChunk[];
  showEmptyState?: boolean;
  emptyLabel?: string;
  onOpenDocumentContext?: (context: {
    fileAssetId?: string;
    fileUrl?: string;
    ragId?: string;
  }) => void;
}) {
  const { pendingCalls, resultCalls, imageSearchResults, pendingImageQueries } =
    useMemo(() => {
      const pending: NotebookAgentToolCall[] = [];
      const done: NotebookAgentToolCall[] = [];
      const mergedImageSearchResults: PresentationImageSearchResult[] = [];
      const mergedPendingImageQueries: string[] = [];

      for (const call of toolCalls) {
        if (isPresentationImageSearchToolName(call.toolName)) {
          if (call.state === "result") {
            const parsed = parsePresentationImageSearchPayload(call.result);

            if (parsed) {
              mergedImageSearchResults.push(parsed);
            }
          } else {
            mergedPendingImageQueries.push(getImageSearchQuery(call));
          }

          continue;
        }

        if (call.state === "result") {
          done.push(call);
        } else {
          pending.push(call);
        }
      }

      return {
        pendingCalls: pending,
        resultCalls: done,
        imageSearchResults: mergedImageSearchResults,
        pendingImageQueries: mergedPendingImageQueries,
      };
    }, [toolCalls]);
  const hasSelectedChunkContext =
    getSelectedChunkLines(selectedChunks).length > 0;
  const hasImageSearchActivity =
    imageSearchResults.length > 0 || pendingImageQueries.length > 0;

  if (toolCalls.length === 0 && !hasSelectedChunkContext) {
    if (!showEmptyState) {
      return null;
    }

    return (
      <div className="rounded-lg border border-primary/20 bg-background p-3 text-xs text-muted-foreground">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {hasSelectedChunkContext ? (
        <SelectedChunkSummary selectedChunks={selectedChunks} />
      ) : null}

      {hasImageSearchActivity ? (
        <PresentationImageSearchActivityCard
          searches={imageSearchResults}
          pendingQueries={pendingImageQueries}
        />
      ) : null}

      {pendingCalls.map((call) => {
        const query = getQueryFromCall(call);

        if (isWebSearchToolName(call.toolName)) {
          return <Searching key={call.id} query={query} />;
        }

        if (call.toolName === "searchDocuments") {
          return <DocumentSearchLoading key={call.id} query={query} />;
        }

        if (call.toolName === "loadDocumentPage") {
          return (
            <DocumentPageLoading
              key={call.id}
              page={
                typeof call.args?.page === "number" ? call.args.page : undefined
              }
              startPage={
                typeof call.args?.startPage === "number"
                  ? call.args.startPage
                  : undefined
              }
              endPage={
                typeof call.args?.endPage === "number"
                  ? call.args.endPage
                  : undefined
              }
            />
          );
        }

        return (
          <div
            key={call.id}
            className="rounded-lg border border-primary/20 bg-background p-3 text-xs text-muted-foreground"
          >
            <p className="text-[13px] font-medium text-foreground/90">
              {getActivityLabel(call.toolName)}
            </p>
            <p className="mt-1.5 text-[12px] text-muted-foreground">
              Processing...
            </p>
          </div>
        );
      })}

      {resultCalls.map((call) => {
        const query = getQueryFromCall(call);

        if (isWebSearchToolName(call.toolName)) {
          const formattedResults: SearchResult[] = getResultsFromCall(call).map(
            (result: unknown) => {
              const searchResult = result as Record<string, unknown>;
              return {
                url: (searchResult.url as string) || "",
                title: (searchResult.title as string) || "No title",
                published_date: "",
                content: (searchResult.content as string) || "No content",
              };
            },
          );

          return (
            <Searched key={call.id} query={query} results={formattedResults} />
          );
        }

        if (call.toolName === "searchDocuments") {
          return (
            <DocumentSearchResultCard
              key={call.id}
              query={query}
              results={
                getResultsFromCall(call) as Array<Record<string, unknown>>
              }
              message={(() => {
                const parsed = parseNotebookAgentToolResult(call.result) as
                  | { message?: string }
                  | undefined;
                return typeof parsed?.message === "string"
                  ? parsed.message
                  : undefined;
              })()}
            />
          );
        }

        if (call.toolName === "loadDocumentPage") {
          const parsed = parseNotebookAgentToolResult(call.result) as
            | {
                content?: string;
                endPage?: number;
                error?: boolean;
                fileName?: string;
                message?: string;
                page?: number;
                pages?: Array<{
                  chunkIds?: string[];
                  content?: string;
                  page?: number;
                }>;
                pageCount?: number | null;
                startPage?: number;
              }
            | undefined;

          return (
            <DocumentPageResultCard
              key={call.id}
              content={
                typeof parsed?.content === "string" ? parsed.content : undefined
              }
              endPage={
                typeof parsed?.endPage === "number" ? parsed.endPage : undefined
              }
              error={parsed?.error === true}
              fileName={
                typeof parsed?.fileName === "string"
                  ? parsed.fileName
                  : undefined
              }
              message={
                typeof parsed?.message === "string" ? parsed.message : undefined
              }
              page={typeof parsed?.page === "number" ? parsed.page : undefined}
              pages={Array.isArray(parsed?.pages) ? parsed.pages : undefined}
              pageCount={
                typeof parsed?.pageCount === "number" ? parsed.pageCount : null
              }
              startPage={
                typeof parsed?.startPage === "number"
                  ? parsed.startPage
                  : undefined
              }
            />
          );
        }

        const rawResult = parseNotebookAgentToolResult(call.result);
        const customActivityResult = renderActivityResult(
          call.toolName,
          rawResult,
          onOpenDocumentContext,
        );
        const previewText = isTextPreviewResult(rawResult)
          ? rawResult.text
          : null;
        const showPlainText =
          previewText !== null &&
          isNotebookAgentActivityEvent(call.toolName) &&
          previewText.trim().length > 0;

        if (
          call.toolName ===
            NOTEBOOK_AGENT_ACTIVITY_TOOL_NAMES.DOCUMENT_CONTEXT &&
          customActivityResult
        ) {
          return <Fragment key={call.id}>{customActivityResult}</Fragment>;
        }

        return (
          <div
            key={call.id}
            className="rounded-lg border border-primary/20 bg-background p-3 text-xs text-muted-foreground"
          >
            <p className="text-[13px] font-medium text-foreground/90">
              {getActivityLabel(call.toolName)}
            </p>
            {customActivityResult ? (
              customActivityResult
            ) : showPlainText ? (
              <p className="mt-1.5 max-h-40 overflow-auto text-[12px] leading-relaxed whitespace-pre-wrap text-muted-foreground">
                {previewText}
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export function NotebookAgentActivityInline({
  toolCalls,
  isRunning = false,
  selectedChunks = EMPTY_SELECTED_CHUNKS,
  defaultExpanded = false,
  onOpenDocumentContext,
}: {
  toolCalls: NotebookAgentToolCall[];
  isRunning?: boolean;
  selectedChunks?: NotebookAgentSelectedChunk[];
  defaultExpanded?: boolean;
  onOpenDocumentContext?: (context: {
    fileAssetId?: string;
    fileUrl?: string;
    ragId?: string;
  }) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const hasSelectedChunkContext =
    getSelectedChunkLines(selectedChunks).length > 0;
  const hasDisplayContent = toolCalls.length > 0 || hasSelectedChunkContext;

  if (!hasDisplayContent && !isRunning) {
    return null;
  }

  return (
    <div className="space-y-2">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center justify-between rounded-lg border bg-muted/30 p-3 text-left transition-colors hover:bg-muted/50"
          >
            <div className="flex min-w-0 items-center gap-2">
              <Search className="size-4 shrink-0 text-blue-500" />
              <span className="truncate text-sm font-medium">
                Agent Activity
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {isRunning ? (
                <span className="flex size-4 shrink-0 items-center justify-center">
                  <Loader2 className="size-4 animate-spin text-blue-500" />
                </span>
              ) : null}
              <span className="text-xs text-muted-foreground">
                {isExpanded ? "Hide" : "Show"}
              </span>
            </div>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent className="space-y-2 px-4 pt-2">
          <NotebookAgentActivityList
            toolCalls={toolCalls}
            selectedChunks={selectedChunks}
            showEmptyState
            onOpenDocumentContext={onOpenDocumentContext}
          />
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
