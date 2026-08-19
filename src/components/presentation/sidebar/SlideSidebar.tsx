"use client";

import { GripVertical, PanelLeftOpen, PanelRightOpen } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import React, { useCallback, useLayoutEffect, useState } from "react";

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Resizable } from "@/components/ui/resizable";
import { usePresentationSlides } from "@/hooks/presentation/usePresentationSlides";
import { useSlideOperations } from "@/hooks/presentation/useSlideOperations";
import { DEFAULT_PRESENTATION_SLIDE_ASPECT_RATIO } from "@/lib/presentation/aspect-ratio";
import { cn } from "@/lib/utils";
import { usePresentationState } from "@/states/presentation-state";
import StaticPresentationEditor from "../../notebook/presentation/editor/presentation-editor-static";
import { Button } from "../../ui/button";
import { Skeleton } from "../../ui/skeleton";
import { SlideThumbnail } from "./SlideThumbnail";
import { Trash2, Copy, ArrowUpToLine, ArrowDownToLine, X } from "lucide-react";

const SIDEBAR_WIDTH_STORAGE_KEY = "presentation-sidebar-width";
const DEFAULT_SIDEBAR_WIDTH = 150;

interface SlideSidebarProps {
  onSlideClick?: (slideId: string) => void;
  currentSlideId?: string;
  showSidebar?: boolean;
  variant?: "docked" | "sheet";
  className?: string;
}

function SlideSidebarBase({
  onSlideClick,
  currentSlideId: currentSlideIdProp,
  showSidebar = true,
  variant = "docked",
  className,
}: SlideSidebarProps) {
  const slideIds = usePresentationState((s) =>
    s.slides.map((slide) => slide.id),
  );
  const slidesCount = slideIds.length;
  const stateCurrentSlideId = usePresentationState((s) => s.currentSlideId);
  const setCurrentSlideId = usePresentationState((s) => s.setCurrentSlideId);
  const isSidebarCollapsed = usePresentationState((s) => s.isSidebarCollapsed);
  const setIsSidebarCollapsed = usePresentationState(
    (s) => s.setIsSidebarCollapsed,
  );
  const isGeneratingPresentation = usePresentationState(
    (s) => s.isGeneratingPresentation,
  );
  const effectiveCurrentSlideId: string =
    typeof currentSlideIdProp === "string"
      ? currentSlideIdProp
      : (stateCurrentSlideId ?? "");
  const isSheetVariant = variant === "sheet";

  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
  const [selectedSlideIds, setSelectedSlideIds] = useState<Set<string>>(
    new Set(),
  );
  const { scrollToSlide } = usePresentationSlides();
  const { deleteSelectedSlides, duplicateSelectedSlides, moveSelectedSlidesTo } =
    useSlideOperations();

  // Load sidebar width from localStorage on mount
  useLayoutEffect(() => {
    if (isSheetVariant) {
      return;
    }

    const stored = localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY);
    if (stored) {
      const parsed = parseInt(stored, 10);
      if (!Number.isNaN(parsed) && parsed >= 100 && parsed <= 300) {
        setSidebarWidth(parsed);
      }
    }
  }, [isSheetVariant]);

  const clearSelection = useCallback(() => {
    setSelectedSlideIds(new Set());
  }, []);

  const handleSlideClick = useCallback(
    (slideId: string, event: React.MouseEvent) => {
      const isCtrlOrCmd = event.metaKey || event.ctrlKey;
      const isShift = event.shiftKey;

      setSelectedSlideIds((prev) => {
        const next = new Set(prev);

        if (isShift && slideIds.length > 0) {
          const currentIdx = slideIds.indexOf(effectiveCurrentSlideId);
          const targetIdx = slideIds.indexOf(slideId);
          if (currentIdx >= 0 && targetIdx >= 0) {
            const [start, end] =
              currentIdx < targetIdx
                ? [currentIdx, targetIdx]
                : [targetIdx, currentIdx];
            for (let i = start; i <= end; i++) {
              const slideId = slideIds[i];
              if (slideId) {
                next.add(slideId);
              }
            }
          }
          return next;
        }

        if (isCtrlOrCmd) {
          if (next.has(slideId)) {
            next.delete(slideId);
          } else {
            next.add(slideId);
          }
          return next;
        }

        return new Set([slideId]);
      });

      setCurrentSlideId(slideId);
      scrollToSlide(slideId);
      onSlideClick?.(slideId);
    },
    [effectiveCurrentSlideId, onSlideClick, scrollToSlide, setCurrentSlideId, slideIds],
  );

  const handleResize = useCallback(
    (_e: unknown, _direction: unknown, _ref: unknown, d: { width: number }) => {
      setSidebarWidth((prev) => {
        const newWidth = prev + d.width;
        localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, newWidth.toString());
        return newWidth;
      });
    },
    [],
  );

  const handleBatchDelete = useCallback(() => {
    if (selectedSlideIds.size === 0) return;
    deleteSelectedSlides(Array.from(selectedSlideIds));
    setSelectedSlideIds(new Set());
  }, [deleteSelectedSlides, selectedSlideIds]);

  const handleBatchDuplicate = useCallback(() => {
    if (selectedSlideIds.size === 0) return;
    duplicateSelectedSlides(Array.from(selectedSlideIds));
  }, [duplicateSelectedSlides, selectedSlideIds]);

  const handleBatchMoveToTop = useCallback(() => {
    if (selectedSlideIds.size === 0) return;
    moveSelectedSlidesTo(Array.from(selectedSlideIds), 0);
  }, [moveSelectedSlidesTo, selectedSlideIds]);

  const handleBatchMoveToBottom = useCallback(() => {
    if (selectedSlideIds.size === 0) return;
    moveSelectedSlidesTo(Array.from(selectedSlideIds), slideIds.length);
  }, [moveSelectedSlidesTo, selectedSlideIds, slideIds.length]);

  const selectedCount = selectedSlideIds.size;

  const slideList = (
    <div
      className={
        isSheetVariant
          ? "scrollbar-thin h-full overflow-auto pr-1 scrollbar-thumb-muted scrollbar-track-transparent"
          : "scrollbar-thin h-max max-h-[80dvh] overflow-auto scrollbar-thumb-muted scrollbar-track-transparent"
      }
    >
      <div className="flex flex-col space-y-4 p-4">
        {!isSheetVariant && (
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold">
              Slides
            </h2>

            <Button
              onClick={() => setIsSidebarCollapsed(true)}
              variant="ghost"
              size="sm"
            >
              <PanelRightOpen className="size-3" />
            </Button>
          </div>
        )}
        {selectedCount > 1 && (
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/50 px-3 py-2">
            <span className="text-xs font-medium text-muted-foreground">
              {selectedCount} selected
            </span>
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="size-7"
                onClick={handleBatchDuplicate}
                title="Duplicate selected"
              >
                <Copy className="size-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="size-7"
                onClick={handleBatchMoveToTop}
                title="Move to top"
              >
                <ArrowUpToLine className="size-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="size-7"
                onClick={handleBatchMoveToBottom}
                title="Move to bottom"
              >
                <ArrowDownToLine className="size-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="size-7 text-destructive hover:text-destructive"
                onClick={handleBatchDelete}
                title="Delete selected"
              >
                <Trash2 className="size-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="size-7"
                onClick={clearSelection}
                title="Clear selection"
              >
                <X className="size-3.5" />
              </Button>
            </div>
          </div>
        )}
        <div className="flex flex-col space-y-4">
          {isGeneratingPresentation && slidesCount === 0 && (
            <div className="aspect-video w-full">
              <Skeleton className="h-full w-full"></Skeleton>
            </div>
          )}
          {slideIds.map((slideId, index) => (
            <MemoPreviewItem
              key={slideId}
              index={index}
              isActive={effectiveCurrentSlideId === slideId}
              isSelected={selectedSlideIds.has(slideId)}
              onClick={(id, event) => handleSlideClick(id, event)}
              slideId={slideId}
              containerWidth={isSheetVariant ? undefined : sidebarWidth - 32}
            />
          ))}
        </div>
      </div>
    </div>
  );

  if (isSheetVariant) {
    if (!showSidebar) {
      return null;
    }

    return (
      <div
        className={cn(
          "pointer-events-none fixed top-1/2 left-3 z-40 flex -translate-y-1/2 justify-start",
          className,
        )}
      >
        {isSidebarCollapsed ? (
          <motion.div
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-auto"
          >
            <button
              onClick={() => setIsSidebarCollapsed(false)}
              className="rounded-2xl border border-border/70 bg-background/95 px-3 py-4 shadow-lg backdrop-blur"
              aria-label="Open slides sidebar"
            >
              <PanelLeftOpen className="size-5 text-primary" />
            </button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.25 }}
            className="pointer-events-auto flex h-[min(60dvh,32rem)] w-[min(11rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-border/70 bg-background/95 shadow-xl backdrop-blur"
          >
            <div className="flex items-center justify-between border-b border-border/60 px-3 py-2.5">
              <h2 className="text-sm font-semibold">
                Slides
              </h2>
              <Button
                onClick={() => setIsSidebarCollapsed(true)}
                variant="ghost"
                size="sm"
                className="size-8"
              >
                <PanelRightOpen className="size-4" />
              </Button>
            </div>
            <div className="min-h-0 flex-1">{slideList}</div>
          </motion.div>
        )}
      </div>
    );
  }

  return (
    <div
      className={
        className
          ? `flex h-full items-center ${className}`
          : "flex h-full items-center"
      }
    >
      <div className="flex h-full items-center">
        <AnimatePresence>
          {showSidebar && !isSidebarCollapsed && (
            <motion.div
              initial={{
                scale: 1,
                width: "auto",
                opacity: 1,
                x: "-100%",
                originX: 0.5,
                originY: 0.5,
              }}
              animate={{
                x: 0,
              }}
              exit={{
                scale: 0,
                width: 0,
                opacity: 0,
                originX: 0.5,
                originY: 0.5,
              }}
              transition={{
                duration: 0.35,
                opacity: { duration: 0.25 },
              }}
              className="overflow-hidden"
            >
              <Resizable
                size={{ width: sidebarWidth }}
                minWidth={100}
                maxWidth={300}
                enable={{ right: true }}
                onResizeStop={handleResize}
                handleComponent={{
                  right: (
                    <div className="group/resize relative flex h-full w-1 cursor-col-resize bg-border">
                      <GripVertical className="absolute top-1/2 left-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 text-muted-foreground opacity-0 group-hover/resize:opacity-100" />
                    </div>
                  ),
                }}
              >
                {slideList}
              </Resizable>
            </motion.div>
          )}
        </AnimatePresence>

        {showSidebar && isSidebarCollapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, x: "0.5rem" }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.4,
              opacity: { duration: 0.4, delay: 0.1 },
            }}
          >
            <button
              onClick={() => setIsSidebarCollapsed(false)}
              className="rounded-md border border-(--presentation-primary) px-1 py-2"
            >
              <PanelLeftOpen className="size-5 text-sm" />
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}

// moved to hooks/presentation/previewSignature

const MemoPreviewItem = React.memo(
  function PreviewItem({
    index,
    isActive,
    isSelected,
    onClick,
    slideId,
    containerWidth,
  }: {
    index: number;
    isActive: boolean;
    isSelected: boolean;
    onClick: (slideId: string, event: React.MouseEvent) => void;
    slideId: string;
    containerWidth?: number;
  }) {
    // Each item fetches its own slide - stable reference unless THIS slide changes
    const slide = usePresentationState((s) =>
      s.slides.find((slide) => slide.id === slideId),
    );

    const {
      addSlide,
      deleteSlide,
      moveSlide,
    } = useSlideOperations();

    const handleClick = useCallback(
      (event: React.MouseEvent) => onClick(slideId, event),
      [onClick, slideId],
    );

    const effectiveContainerWidth =
      typeof containerWidth === "number"
        ? containerWidth -
          ((slide?.formatCategory ?? "presentation") === "social" ? 8 : 0)
        : undefined;

    const handleDuplicate = useCallback(() => {
      if (!slide) return;
      addSlide("after", slideId, slide);
    }, [addSlide, slide, slideId]);

    const handleDelete = useCallback(() => {
      deleteSlide(slideId);
    }, [deleteSlide, slideId]);

    const handleMoveUp = useCallback(() => {
      moveSlide(slideId, "up");
    }, [moveSlide, slideId]);

    const handleMoveDown = useCallback(() => {
      moveSlide(slideId, "down");
    }, [moveSlide, slideId]);

    if (!slide) return null;

    return (
      <ContextMenu>
        <ContextMenuTrigger>
          <SlideThumbnail
            index={index} // For showing the slide number
            isActive={isActive}
            isSelected={isSelected}
            onClick={handleClick}
            widthSize={(slide.width ?? "M") as "S" | "M" | "L"}
            formatCategory={slide.formatCategory ?? "presentation"}
            aspectRatio={
              slide.aspectRatio ?? DEFAULT_PRESENTATION_SLIDE_ASPECT_RATIO
            }
            containerWidth={effectiveContainerWidth}
          >
            <StaticPresentationEditor
              initialContent={slide}
              className="border"
              id={`preview-${slideId}`}
            />
          </SlideThumbnail>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={handleDuplicate}>
            Duplicate
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={handleMoveUp}>Move Up</ContextMenuItem>
          <ContextMenuItem onClick={handleMoveDown}>Move Down</ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive">
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    );
  },
  (prev, next) => {
    if (prev.index !== next.index) return false;
    if (prev.isActive !== next.isActive) return false;
    if (prev.isSelected !== next.isSelected) return false;
    if (prev.slideId !== next.slideId) return false;
    if (prev.containerWidth !== next.containerWidth) return false;
    return true;
  },
);

export const SlideSidebar = React.memo(SlideSidebarBase);
