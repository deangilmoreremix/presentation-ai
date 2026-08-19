# Task Wire Report

## Summary

Wired orphaned presentation editor files from `src/components/notebook/presentation/editor/` into the canonical location `src/components/presentation/editor/`.

## Files Copied

- **Total copied:** 326 files
- **Destination file count:** 333 (326 copied + 7 pre-existing files already at canonical location)

## Import Rewrites

- **Pattern rewritten:** `from "@/components/notebook/presentation/editor/..."` → `from "@/components/presentation/editor/..."`
- **Rewrites made:** 7 import statements across 5 files
- **Left unchanged:** Imports from `@/components/notebook/presentation/...` (outside `editor/`), `@/components/plate/...`, `@/components/ui/...`, `@/lib/...`, and relative paths

## TypeScript Error Count

- **Total errors:** 211
- **Errors in `src/components/presentation/editor/`:** 210
- **Errors elsewhere (pre-existing):** 1 (`src/middleware.ts`)

### Notable error categories in copied tree

1. **`lib.ts` shadowing `lib.tsx`:** The destination already contained a pre-existing `lib.ts` stub (11 lines) that shadows the copied `lib.tsx` (51 KB). This causes ~90+ "has no exported member" errors because TypeScript resolves `../../lib` to the stub instead of the full implementation.
2. **Missing utility modules:** Several copied files import `../../utils/normalizePresentationSlate`, `../../utils/templates`, and `../../utils/LazyPreview`, which do not exist in either the source or destination. These are pre-existing issues in the source code.
3. **Type mismatches:** Several files pass an `index` prop to components that don't accept it. These are pre-existing type errors in the source.
4. **Missing module:** `src/components/presentation/editor/custom-elements/presentation-table-node.tsx` imports `../../../../plate/ui/block-selection` which doesn't exist.

## Concerns

- **Pre-existing `lib.ts` conflict:** The 7 pre-existing files at the canonical location (`lib.ts`, `bullets-elements.tsx`, `icon-item.tsx`, `icons-element.tsx`, `staircase-element.tsx`, `visualization-item-plugin.tsx`, `visualization-list-plugin.tsx`, `plugins.ts`) remain and depend on the stub `lib.ts`. A later pass should either:
  - Update them to import from the canonical `lib.tsx`, or
  - Remove them if they are superseded by the copied tree.
- **High TypeScript error count:** 210 errors in the copied tree will block CI. Most are caused by the `lib.ts` shadowing issue or are pre-existing source errors. The `lib.ts` conflict should be resolved before considering the migration complete.
- **No files deleted from source:** As instructed, nothing was removed from `src/components/notebook/presentation/editor/`. A cleanup pass should delete that tree once the new location is verified.
