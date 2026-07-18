"use client";

import React from "react";
import { cn } from "@/components/plate/utils";
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
import { type TElement } from "platejs";
import { VISUALIZATION_ITEM_ELEMENT } from "./visualization-item-plugin";

// PyramidItem component for individual items in the pyramid
export const PyramidItem = ({
  index,
  totalItems,
  element,
  children,
}: {
  index: number;
  totalItems: number;
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
        dragEntry[0].type === VISUALIZATION_ITEM_ELEMENT &&
        dropEntry[0].type === VISUALIZATION_ITEM_ELEMENT
      );
    },
  });

  // Add drop line indicator
  const { dropLine } = useDropLine({
    id: element.id as string,
    orientation: "vertical",
  });

  // Constants for shape sizes
  const shapeHeight = 80;
  const maxWidthPercentage = 80; // Maximum width the bottom layer should take up
  const increment = maxWidthPercentage / (2 * totalItems);

  // Calculate clip path using the provided algorithm
  const calculateClipPath = () => {
    if (index === 0) {
      // First layer is a triangle
      return `polygon(50% 0%, ${50 - increment}% 100%, ${50 + increment}% 100%)`;
    } else {
      // For other layers
      const prevXOffset = increment * index;
      const currentXOffset = increment * (index + 1);

      const prevBottomLeft = 50 - prevXOffset;
      const prevBottomRight = 50 + prevXOffset;

      const currentBottomLeft = 50 - currentXOffset;
      const currentBottomRight = 50 + currentXOffset;

      return `polygon(${prevBottomLeft}% 0%, ${prevBottomRight}% 0%, ${currentBottomRight}% 100%, ${currentBottomLeft}% 100%)`;
    }
  };

  const calculateLeftOffset = () => {
    return (40 - (index + 1) * increment) * 0.5;
  };

  const clipPath = calculateClipPath();

  return (
    <div
      ref={previewRef}
      className={cn(
        "group/pyramid-item relative w-full",
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
            "opacity-0 transition-opacity group-hover/pyramid-item:opacity-100",
          )}
        >
          <PyramidItemDragHandle />
        </div>
      )}

      {/* The pyramid item layout */}
      <div className="flex items-center border-b border-gray-700">
        {/* Shape with number */}
        <div className="relative flex-1">
          <div
            className="grid place-items-center text-2xl font-bold"
            style={{
              height: `${shapeHeight}px`,
              clipPath: clipPath,
              backgroundColor: "var(--presentation-primary)",
              color: "var(--presentation-background)",
            }}
          >
            {index + 1}
          </div>
        </div>

        {/* Content area with proper vertical alignment and negative margin */}
        <div
          className="relative flex flex-1 items-center"
          style={{
            minHeight: `${shapeHeight}px`,
            right: `${calculateLeftOffset()}%`,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

// Drag handle component
const PyramidItemDragHandle = React.memo(() => {
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
PyramidItemDragHandle.displayName = "PyramidItemDragHandle";
