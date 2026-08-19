# Missing Features — Path B Implementation Plan

## Context
Local main is missing 211 files from upstream/development. The deleted upstream
`src/components/presentation/dashboard/` folder contained the old dashboard UI.
Local main uses a notebook-based architecture (`src/components/notebook/presentation/`).
We are rebuilding the missing features in the local architecture.

Already completed:
- PresentationTemplates (templates dialog)
- PresentationExamples (example prompts grid)
- Image editor integration into presentation maker

Remaining tasks (independent, can be parallelized):

Task 1: PresentationsSidebar — slide-out sidebar showing recent presentations with create-new, infinite scroll, delete, and selection mode.

Task 2: SelectionControls — bulk select/deselect/delete toolbar for presentations.

Task 3: Editor custom elements — slide content types: bullet-item, arrow-item, cycle-element, staircase-element, timeline-item, visualization-list-plugin, visualization-item-plugin, icon, icons-element, generating-leaf.

Task 4: DnD support — drag-and-drop hooks and transforms for the presentation editor.

Task 5: presentation.css + editor plugins/native elements — global presentation styles, editor plugin registration, native element renderers.
