export const WEB_SEARCH_TOOL_NAME = "tavily_search_results_json";
export const LEGACY_WEB_SEARCH_TOOL_NAME = "webSearch";
export const PRESENTATION_IMAGE_SEARCH_TOOL_NAME = "search_presentation_images";

export function isWebSearchToolName(toolName: string) {
  return (
    toolName === WEB_SEARCH_TOOL_NAME ||
    toolName === LEGACY_WEB_SEARCH_TOOL_NAME
  );
}

export function isPresentationImageSearchToolName(toolName: string): boolean {
  return toolName === PRESENTATION_IMAGE_SEARCH_TOOL_NAME;
}
