# Task 3: DnD Support

## Context
Local main is missing drag-and-drop hooks and transforms for the presentation editor. These enable users to reorder slides and elements via drag-and-drop.

## Requirements

Create the following files by reading from upstream and adapting imports:

1. `src/components/presentation/editor/dnd/hooks/index.ts` — barrel export
2. `src/components/presentation/editor/dnd/hooks/useDndNode.ts` — DnD node hook
3. `src/components/presentation/editor/dnd/hooks/useDragNode.ts` — Drag node hook
4. `src/components/presentation/editor/dnd/hooks/useDraggable.ts` — Draggable hook
5. `src/components/presentation/editor/dnd/hooks/useDropNode.ts` — Drop node hook
6. `src/components/presentation/editor/dnd/hooks/useDropLine.ts` — Drop line hook
7. `src/components/presentation/editor/dnd/components/LayoutImageDrop.tsx` — Image drop component
8. `src/components/presentation/editor/dnd/transforms/onDropNode.ts` — Drop transform
9. `src/components/presentation/editor/dnd/transforms/onHoverNode.ts` — Hover transform
10. `src/components/presentation/editor/dnd/utils/getHoverDirection.ts` — Hover direction utility
11. `src/components/presentation/editor/dnd/utils/getNewDirection.ts` — New direction utility
12. `src/components/presentation/editor/dnd/utils/index.ts` — barrel export

## Instructions
For each file:
1. Read from upstream: `git show upstream/development:src/components/presentation/editor/dnd/<path>`
2. Adapt imports to local paths
3. Keep logic identical — only fix import paths
4. If upstream uses `@dnd-kit/core` or similar, check if local package.json has it. If not, keep the code and flag it.

## What NOT to do
- Do NOT modify existing editor code
- Do NOT add new dependencies without checking package.json first
- Do NOT change DnD logic — port verbatim

## Report
Write your report to `.kilo/sdd/task-3-report.md` with:
- Files created (count)
- Import adaptations
- New dependencies needed (if any)
- Typecheck status
