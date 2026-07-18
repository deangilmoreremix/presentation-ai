"use client";

import { ParagraphPlugin } from "platejs/react";
import { ImagePlugin } from "@platejs/media/react";
import { MarkdownPlugin } from "@platejs/markdown";
import {
  HeadingPlugin,
  BlockquotePlugin,
  BoldPlugin,
  ItalicPlugin,
  UnderlinePlugin,
  StrikethroughPlugin,
} from "@platejs/basic-nodes/react";
import { ColumnPlugin, ColumnItemPlugin } from "@platejs/layout/react";
import { AutoformatKit } from "@/components/plate/plugins/autoformat-kit";
import { ExitBreakKit } from "@/components/plate/plugins/exit-break-kit";
import { BlockSelectionKit } from "@/components/plate/plugins/block-selection-kit";
import { DndKit } from "@/components/plate/plugins/dnd-kit";
import { VisualizationListPlugin } from "./custom-elements/visualization-list-plugin";
import { VisualizationItemPlugin } from "./custom-elements/visualization-item-plugin";
import { SlashInputPlugin, SlashPlugin } from "@platejs/slash-command/react";
import {
  BulletPlugin,
  BulletsPlugin,
} from "./custom-elements/bullets-elements";
import {
  StaircasePlugin,
  StairItemPlugin,
} from "./custom-elements/staircase-element";
import { CycleItemPlugin, CyclePlugin } from "./custom-elements/cycle-element";
import { IconPlugin } from "./custom-elements/icon";
import { IconItemPlugin, IconsPlugin } from "./custom-elements/icons-element";
import { GeneratingPlugin } from "./custom-elements/generating-leaf";

// Create presentation-specific plugins
export const presentationPlugins = [
  // Basic nodes
  HeadingPlugin.configure({
    options: { levels: 6 },
  }),
  BlockquotePlugin,
  ParagraphPlugin,

  // Basic marks
  BoldPlugin,
  ItalicPlugin,
  UnderlinePlugin,
  StrikethroughPlugin,

  // Media
  ImagePlugin.extend({
    options: { disableUploadInsert: false },
  }),

  // Layout
  ColumnPlugin.configure({
    options: {
      spacing: 20,
    },
  }),
  ColumnItemPlugin,

  // Custom ELements
  VisualizationListPlugin,
  VisualizationItemPlugin,

  BulletPlugin,
  BulletsPlugin,

  StaircasePlugin,
  StairItemPlugin,

  IconPlugin,
  IconsPlugin,
  IconItemPlugin,

  CycleItemPlugin,
  CyclePlugin,

  GeneratingPlugin,
  // Functionality
  ...AutoformatKit,
  ...ExitBreakKit,
  ...BlockSelectionKit,
  ...DndKit,
  SlashInputPlugin,
  SlashPlugin,
  // Deserialization
  MarkdownPlugin.configure({
    options: {
      disallowedNodes: ["suggestion"],
    },
  }),
] as const;
