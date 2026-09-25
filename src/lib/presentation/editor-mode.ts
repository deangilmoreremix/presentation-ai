export type PresentationEditorMode = "flow" | "design";

export const PRESENTATION_EDITOR_MODE_OPTIONS = [
  { label: "Flow", value: "flow" },
  { label: "Design", value: "design" },
] as const;

export function formatPresentationEditorMode(
  mode: PresentationEditorMode | string | null | undefined,
): string {
  if (mode === "design") {
    return "Design";
  }

  return "Flow";
}

export function getPresentationEditorModeLabel(
  mode: PresentationEditorMode | string | null | undefined,
): string {
  return formatPresentationEditorMode(mode);
}
