# Final branch review — Plate v53 type-error fixes (uncommitted working tree)

## Scope: fixes for 33 tsc errors across 15 files

### git diff --stat (tracked changes only)

### NOTE: files are untracked (new from upstream sync), so show full content diff via git diff against /dev/null is N/A.
### Full current content of changed files follows (generated-leaf, utils.tsx, and one representative item + element file), plus grep of all import fixes.

=== src/components/plate/utils.tsx ===
"use client";

import { type ClassValue, clsx } from "clsx";
import { forwardRef, type FC } from "react";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function withRef<T extends FC<any>>(
  Component: T,
) {
  return forwardRef<any, any>((props, ref) => {
    const C = Component as any;
    return <C {...props} ref={ref} />;
  }) as unknown as T;
}

export function withVariants<T extends FC<any>>(
  Component: T,
  _variants: any,
) {
  return Component;
}

=== grep usePluginOption across item files ===
src/components/presentation/editor/custom-elements/arrow-item.tsx:8:import { usePluginOption } from "platejs/react";
src/components/presentation/editor/custom-elements/arrow-item.tsx:32:  const isSelectionAreaVisible = usePluginOption(BlockSelectionPlugin, "isSelectionAreaVisible");
src/components/presentation/editor/custom-elements/bullet-item.tsx:9:import { usePluginOption } from "platejs/react";
src/components/presentation/editor/custom-elements/bullet-item.tsx:32:  const isSelectionAreaVisible = usePluginOption(BlockSelectionPlugin, "isSelectionAreaVisible");
src/components/presentation/editor/custom-elements/cycle-item.tsx:9:import { usePluginOption } from "platejs/react";
src/components/presentation/editor/custom-elements/cycle-item.tsx:33:  const isSelectionAreaVisible = usePluginOption(BlockSelectionPlugin, "isSelectionAreaVisible");
src/components/presentation/editor/custom-elements/icon-item.tsx:9:import { usePluginOption } from "platejs/react";
src/components/presentation/editor/custom-elements/icon-item.tsx:30:  const isSelectionAreaVisible = usePluginOption(BlockSelectionPlugin, "isSelectionAreaVisible");
src/components/presentation/editor/custom-elements/pyramid-item.tsx:8:import { usePluginOption } from "platejs/react";
src/components/presentation/editor/custom-elements/pyramid-item.tsx:34:  const isSelectionAreaVisible = usePluginOption(BlockSelectionPlugin, "isSelectionAreaVisible");
src/components/presentation/editor/custom-elements/staircase-item.tsx:9:import { usePluginOption } from "platejs/react";
src/components/presentation/editor/custom-elements/staircase-item.tsx:34:  const isSelectionAreaVisible = usePluginOption(BlockSelectionPlugin, "isSelectionAreaVisible");
src/components/presentation/editor/custom-elements/timeline-item.tsx:8:import { usePluginOption } from "platejs/react";
src/components/presentation/editor/custom-elements/timeline-item.tsx:33:  const isSelectionAreaVisible = usePluginOption(BlockSelectionPlugin, "isSelectionAreaVisible");

=== grep createPlatePlugin import sources ===
src/components/presentation/editor/custom-elements/bullets-elements.tsx:6:import { createPlatePlugin } from "platejs/react";
src/components/presentation/editor/custom-elements/cycle-element.tsx:6:import { createPlatePlugin } from "platejs/react";
src/components/presentation/editor/custom-elements/icon.tsx:5:import { createPlatePlugin } from "platejs/react";
src/components/presentation/editor/custom-elements/icons-element.tsx:6:import { createPlatePlugin } from "platejs/react";
src/components/presentation/editor/custom-elements/staircase-element.tsx:6:import { createPlatePlugin } from "platejs/react";
src/components/presentation/editor/custom-elements/visualization-item-plugin.tsx:6:import { createPlatePlugin } from "platejs/react";
src/components/presentation/editor/custom-elements/visualization-list-plugin.tsx:6:import { createPlatePlugin } from "platejs/react";

=== grep useDraggable (confirm no top-level id) ===
src/components/presentation/editor/custom-elements/arrow-item.tsx-47-  const { dropLine } = useDropLine({
src/components/presentation/editor/custom-elements/arrow-item.tsx:48:    id: element.id as string,
--
src/components/presentation/editor/custom-elements/bullet-item.tsx-47-  const { dropLine } = useDropLine({
src/components/presentation/editor/custom-elements/bullet-item.tsx:48:    id: element.id as string,
--
src/components/presentation/editor/custom-elements/cycle-item.tsx-48-  const { dropLine } = useDropLine({
src/components/presentation/editor/custom-elements/cycle-item.tsx:49:    id: element.id as string,
--
src/components/presentation/editor/custom-elements/icon-item.tsx-45-  const { dropLine } = useDropLine({
src/components/presentation/editor/custom-elements/icon-item.tsx:46:    id: element.id as string,
--
src/components/presentation/editor/custom-elements/pyramid-item.tsx-49-  const { dropLine } = useDropLine({
src/components/presentation/editor/custom-elements/pyramid-item.tsx:50:    id: element.id as string,
--
src/components/presentation/editor/custom-elements/staircase-item.tsx-49-  const { dropLine } = useDropLine({
src/components/presentation/editor/custom-elements/staircase-item.tsx:50:    id: element.id as string,
--
src/components/presentation/editor/custom-elements/timeline-item.tsx-48-  const { dropLine } = useDropLine({
src/components/presentation/editor/custom-elements/timeline-item.tsx:49:    id: element.id as string,

=== grep withRef usage ===
src/components/presentation/editor/custom-elements/bullets-elements.tsx:18:export const BulletsElement = withRef<any>(
src/components/presentation/editor/custom-elements/cycle-element.tsx:18:export const CycleElement = withRef<any>(
src/components/presentation/editor/custom-elements/generating-leaf.tsx:10:export const GeneratingLeaf = withRef<any>(
src/components/presentation/editor/custom-elements/icon.tsx:20:export const IconElementComponent = withRef<any>(
src/components/presentation/editor/custom-elements/icons-element.tsx:18:export const IconsElement = withRef<any>(
src/components/presentation/editor/custom-elements/staircase-element.tsx:18:export const StaircaseElement = withRef<any>(
src/components/presentation/editor/custom-elements/visualization-item-plugin.tsx:17:export const VisualizationItemElementComponent = withRef<any>(
src/components/presentation/editor/custom-elements/visualization-list-plugin.tsx:102:export const VisualizationListElement = withRef<any>(
=== arrow-item.tsx (representative item file: useEditorPlugin->usePluginOption, useDraggable id removed) ===
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

  return (
    <div
      ref={previewRef}
      className={cn(

=== visualization-list-plugin.tsx head (TDescendant->Descendant, createPlatePlugin source) ===
"use client";

import React from "react";
import { cn, withRef } from "@/components/plate/utils";
import { type Descendant, type TElement } from "platejs";
import { createPlatePlugin } from "platejs/react";
import { PlateElement } from "platejs/react";

// Import draggable item components
import { PyramidItem } from "./pyramid-item";
import { ArrowItem } from "./arrow-item";
import { TimelineItem } from "./timeline-item";

=== confirm useDropLine id preserved in arrow-item ===
5:import { useDraggable, useDropLine } from "@platejs/dnd";
6-import { GripVertical } from "lucide-react";
7-import { useReadOnly } from "slate-react";
--
47:  const { dropLine } = useDropLine({
48-    id: element.id as string,
49-    orientation: "vertical",
