"use client";

import React from "react";
import { cn } from "@/components/plate/utils";
import { type TElement } from "platejs";
import { useDraggable, useDropLine } from "@platejs/dnd";
import { GripVertical } from "lucide-react";
import { useReadOnly } from "slate-react";
import { usePluginOption } from "platejs/react";
import { BlockSelectionPlugin } from "@platejs/selection/react";
import { Button } from "@/components/plate/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/plate/ui/tooltip";
import { Portal } from "@radix-ui/react-tooltip";
import { BULLET_ELEMENT } from "../lib";

// BulletItem component for numbered blocks with content
export const BulletItem = ({
  index,
  element,
  children,
}: {
  index: number;
  element: TElement;
  children: React.ReactNode;
}) => {
  const readOnly = useReadOnly();
  const isSelectionAreaVisible = usePluginOption(BlockSelectionPlugin, "isSelectionAreaVisible");

  // Add draggable functionality
  const { isDragging, previewRef, handleRef } = useDraggable({
    element,
    orientation: "vertical",
    canDropNode: ({ dragEntry, dropEntry }) => {
      return (
        dragEntry[0].type === BULLET_ELEMENT &&
        dropEntry[0].type === BULLET_ELEMENT
      );
    },
  });

  // Add drop line indicator
  const { dropLine } = useDropLine({
    id: element.id as string,
    orientation: "vertical",
  });

  return (
    <div
      ref={previewRef}
      className={cn(
        "group/bullet-item relative",
        isDragging && "opacity-50",
        dropLine && "drop-target",
      )}
    >
      {/* Drop target indicator lines */}
      {!readOnly && !isSelectionAreaVisible && dropLine && (
        <div
          className={cn(
            "absolute z-50 bg-primary/50",
            dropLine === "top" && "inset-x-0 top-0 h-1",
            dropLine === "bottom" && "inset-x-0 bottom-0 h-1",
          )}
        />
      )}

      {/* Drag handle that appears on hover */}
      {!readOnly && !isSelectionAreaVisible && (
        <div
          ref={handleRef}
          className={cn(
            "absolute left-0 top-1/2 z-50 -translate-x-full -translate-y-1/2 pr-2",
            "pointer-events-auto flex items-center",
            "opacity-0 transition-opacity group-hover/bullet-item:opacity-100",
          )}
        >
          <BulletItemDragHandle />
        </div>
      )}

      {/* The bullet item layout with numbered block and content */}
      <div className="flex items-start">
        {/* Numbered square/block */}
        <div
          className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-md bg-primary text-xl font-bold text-primary-foreground"
          style={{
            backgroundColor: "var(--presentation-primary)",
            color: "var(--presentation-background)",
          }}
        >
          {index + 1}
        </div>

        {/* Content area */}
        <div className="ml-4 flex-1">{children}</div>
      </div>
    </div>
  );
};

// Drag handle component
const BulletItemDragHandle = React.memo(() => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button size="icon" variant="ghost" className="h-5 px-1">
            <GripVertical
              className="size-4 text-muted-foreground"
              onClick={(event) => {
                event.stopPropagation();
                event.preventDefault();
              }}
            />
          </Button>
        </TooltipTrigger>
        <Portal>
          <TooltipContent>Drag to move item</TooltipContent>
        </Portal>
      </Tooltip>
    </TooltipProvider>
  );
});
BulletItemDragHandle.displayName = "BulletItemDragHandle";
