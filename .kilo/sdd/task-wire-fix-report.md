# Task Wire Fix Report — TypeScript errors in `src/components/presentation/editor/`

## Result

`npx tsc --noEmit` reports **0 errors** in `src/components/presentation/editor/`.

## Files modified (6)

1. `custom-elements/bullets-elements.tsx` — renamed `BULLET_ELEMENT`/`BULLETS_ELEMENT` → `BULLET_ITEM`/`BULLET_GROUP`; cast `BulletItem` props object to `any`.
2. `custom-elements/staircase-element.tsx` — renamed `STAIR_ITEM_ELEMENT`/`STAIRCASE_ELEMENT` → `STAIR_ITEM`/`STAIRCASE_GROUP`; cast `StairItem` props object to `any`.
3. `custom-elements/icons-element.tsx` — renamed `ICON_ITEM_ELEMENT`/`ICONS_ELEMENT` → `ICON_LIST_ITEM`/`ICON_LIST`.
4. `custom-elements/icon-item.tsx` — renamed `ICON_ITEM_ELEMENT` → `ICON_LIST_ITEM`.
5. `custom-elements/visualization-list-plugin.tsx` — cast `PyramidItem`, `ArrowItem`, and `TimelineItem` props objects to `any`.
6. `custom-elements/presentation-table-node.tsx` — fixed import path `../../../../plate/ui/block-selection` → `@/components/plate/ui/block-selection`.

## Files created (3)

Re-export shims (placed in `src/components/presentation/utils/`, matching the existing `parser.ts`/`types.ts` shims there):

1. `src/components/presentation/utils/normalizePresentationSlate.ts` → `export * from "@/components/notebook/presentation/utils/normalizePresentationSlate"`
2. `src/components/presentation/utils/LazyPreview.tsx` → `export { default } from "@/components/notebook/presentation/utils/LazyPreview"`
3. `src/components/presentation/utils/templates.ts` → re-exports `TEMPLATE_CATEGORIES`, `TEMPLATE_DEFINITIONS`, `TemplateDefinition` from `@/components/notebook/presentation/utils/templates`

## Final TypeScript error count

- `src/components/presentation/editor/`: **0 errors**
- Whole project: 1 remaining error, in `src/middleware.ts(21,26)` (unrelated to this task, out of scope).

## Remaining concerns / deviations from the brief

1. **Shim location differed from the brief.** The brief said to create the shims in `editor/utils/`, but the consuming imports (`../../utils/...` from `editor/components/`, `editor/hooks/`, and `editor/custom-elements/`) resolve to `src/components/presentation/utils/`, not `editor/utils/`. The existing `presentation/utils/parser.ts` and `types.ts` shims confirm this is the intended location. Shims were created in `presentation/utils/`.

2. **`templates.ts` re-export source differed from the brief.** The brief said to re-export from `@/lib/image/templates`, but that module only exports image-generation templates (`IMAGE_TEMPLATES`, `getTemplate`, etc.) and does not export `TEMPLATE_CATEGORIES`, `TEMPLATE_DEFINITIONS`, or `TemplateDefinition`. The correct source is `@/components/notebook/presentation/utils/templates` (the same source the notebook's `SlideTemplateModal` uses).

3. **The `as T*Element` casts in the brief were insufficient.** The item components (`BulletItem`, `StairItem`, `PyramidItem`, `ArrowItem`, `TimelineItem`) are all typed as `PlateElementProps<...>`, which requires `editor`, `plugin`, `attributes`, `path`, etc. Casting only the `element` prop to the specific element type still leaves the whole props object mismatched. The fix that actually compiles is to cast the entire props object to `any` (the same approach the brief itself prescribed for `TimelineItem`). This is a pragmatic workaround for a deeper architectural issue: the list/group components (`BulletsElement`, `StaircaseElement`, `VisualizationListElement`) manually render their child item components with incomplete props instead of letting Plate's rendering pipeline supply full `PlateElementProps`. A proper fix would refactor these to render children through Plate rather than invoking the item components directly.
