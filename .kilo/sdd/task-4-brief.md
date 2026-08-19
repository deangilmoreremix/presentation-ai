# Task 4: presentation.css + Editor Plugins/Native Elements

## Context
Local main is missing global presentation styles, editor plugin registration, and native element renderers from upstream.

## Requirements

### Part A: presentation.css
Create `src/app/presentation.css` by reading `upstream/development:src/app/presentation.css`.
This file contains CSS custom properties for the Mystique theme (light/dark mode).

### Part B: Editor plugins
Create `src/components/presentation/editor/plugins.ts` by reading from upstream.
This registers Plate editor plugins for the presentation editor.

### Part C: Editor lib
Create `src/components/presentation/editor/lib.ts` by reading from upstream.
This exports element type constants and helpers used by custom elements.

### Part D: Native elements
Create the following files by reading from upstream and adapting imports:
- `src/components/presentation/editor/native-elements/index.ts`
- `src/components/presentation/editor/native-elements/editor-static.tsx`
- `src/components/presentation/editor/native-elements/presentation-element.tsx`
- `src/components/presentation/editor/native-elements/presentation-heading-element.tsx`
- `src/components/presentation/editor/native-elements/presentation-image-editor.tsx`
- `src/components/presentation/editor/native-elements/presentation-image-element.tsx`
- `src/components/presentation/editor/native-elements/presentation-leaf-element.tsx`
- `src/components/presentation/editor/native-elements/presentation-paragraph-element.tsx`
- `src/components/presentation/editor/native-elements/root-image.tsx`

## Instructions
For each file:
1. Read from upstream: `git show upstream/development:src/components/presentation/editor/<path>`
2. Adapt imports to local paths
3. Keep logic identical
4. If a native element conflicts with an existing local file (e.g., `presentation-image-editor.tsx` already exists under `custom-elements/`), check if they're the same file or duplicates. If same content, skip. If different, keep both.

## What NOT to do
- Do NOT modify existing editor code
- Do NOT change CSS values — port verbatim
- Do NOT add new dependencies

## Report
Write your report to `.kilo/sdd/task-4-report.md` with:
- Files created (count)
- Any conflicts with existing files
- Typecheck status
