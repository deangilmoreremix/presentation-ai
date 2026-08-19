# Task 1: PresentationsSidebar + SelectionControls

## Context
Local main is missing the presentation sidebar UI from upstream/development. The Zustand state already has all required fields (`isSheetOpen`, `setIsSheetOpen`, `isSelecting`, `selectedPresentations`, `toggleSelecting`, `selectAllPresentations`, `deselectAllPresentations`, `togglePresentationSelection`). We just need the UI components.

## Requirements

### 1. SelectionControls (`src/components/presentation/dashboard/SelectionControls.tsx`)
Rebuild the upstream `SelectionControls` component verbatim. It renders:
- A "Select" button when `isSelecting` is false
- When selecting: Cancel, Deselect All (or Select All), and Delete buttons with AlertDialog confirmation
- Props: `isSelecting`, `selectedCount`, `totalCount`, `onToggleSelecting`, `onSelectAll`, `onDeselectAll`, `onDelete`

Use local UI components: `@/components/ui/button`, `@/components/ui/alert-dialog`, lucide-react icons.

### 2. PresentationsSidebar (`src/components/presentation/dashboard/PresentationsSidebar.tsx`)
Rebuild the upstream `PresentationsSidebar` component adapted for local architecture:
- Sheet (left side) with `overlay={false}`, `side="left"`, `container` targeting `.notebook-section`
- Header with "Your Presentations" title, "Create New Presentation" button, and SelectionControls
- ScrollArea with infinite scroll list of presentations
- Each item is a `PresentationItem` (already exists at `src/components/presentation/PresentationItem.tsx`)
- Loading skeletons, error state, empty state
- Uses `useInfiniteQuery` with queryKey `["presentations-all"]` and `fetchPresentations` server action
- Uses `useMutation` with `deletePresentations` for bulk delete
- On success: invalidate `["presentations-all"]` and `["recent-items"]` queries, deselect all, toggle selecting off, toast success
- On error: toast error

### State shape (already exists in presentation-state.ts)
```ts
isSheetOpen: boolean;
setIsSheetOpen: (isOpen: boolean) => void;
isSelecting: boolean;
selectedPresentations: string[];
toggleSelecting: () => void;
selectAllPresentations: (ids: string[]) => void;
deselectAllPresentations: () => void;
togglePresentationSelection: (id: string) => void;
```

### What NOT to do
- Do NOT add Prisma types — use the local `fetchPresentations` return type instead
- Do NOT modify existing dashboard components — only add new files
- Do NOT add auth gates — fetchPresentations already handles auth

## Report
Write your report to `.kilo/sdd/task-1-report.md` with:
- Files created
- Typecheck status
- Any concerns
