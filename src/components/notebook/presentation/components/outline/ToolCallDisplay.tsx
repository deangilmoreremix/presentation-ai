"use client";

import { NotebookAgentActivityInline } from "@/components/notebook/shared/NotebookAgentActivity";
import { withNotebookAgentDocumentContext } from "@/lib/notebook/agent-activity";
import { getNotebookAttachmentRagId } from "@/lib/notebook/attachments";
import { usePresentationState } from "@/states/presentation-state";

interface ToolCallDisplayProps {
  isGeneratingOutlineOverride?: boolean;
  onOpenFileProcessor?: (context: {
    fileAssetId?: string;
    fileUrl?: string;
    ragId?: string;
  }) => void;
}

export function ToolCallDisplay({
  isGeneratingOutlineOverride,
  onOpenFileProcessor,
}: ToolCallDisplayProps) {
  const {
    attachedFiles,
    extractorRagIds,
    isGeneratingOutline: isGeneratingOutlineFromState,
    outlineToolCalls,
    selectedChunks,
    webSearchEnabled,
  } = usePresentationState((state) => ({
    attachedFiles: state.attachedFiles,
    extractorRagIds: state.extractorRagIds,
    isGeneratingOutline: state.isGeneratingOutline,
    outlineToolCalls: state.outlineToolCalls,
    selectedChunks: state.selectedChunks,
    webSearchEnabled: state.webSearchEnabled,
  }));
  const isGeneratingOutline =
    isGeneratingOutlineOverride ?? isGeneratingOutlineFromState;
  const displayToolCalls = outlineToolCalls.filter(
    (call) => call.toolName !== "loadDocumentPage",
  );
  const hasSearchOrFileContext =
    webSearchEnabled ||
    attachedFiles.length > 0 ||
    displayToolCalls.some((call) => call.toolName === "searchDocuments");
  const hasDynamicToolActivity = displayToolCalls.length > 0;

  if (!hasSearchOrFileContext && !hasDynamicToolActivity) {
    return null;
  }

  const shouldAutoExpandActivity =
    isGeneratingOutline &&
    (hasSearchOrFileContext ||
      hasDynamicToolActivity ||
      outlineToolCalls.length > 0);
  const activityPanelMode = isGeneratingOutline
    ? shouldAutoExpandActivity
      ? "running-active"
      : "running-idle"
    : "idle";
  const toolCallsWithDocumentContext = withNotebookAgentDocumentContext(
    displayToolCalls,
    attachedFiles.map((file, index) => {
      const ragId = getNotebookAttachmentRagId({
        attachment: file,
        attachments: attachedFiles,
        extractorRagIds,
        index,
      });

      return {
        fileAssetId: file.fileAssetId,
        fileName: file.name,
        fileUrl: file.url,
        processingStatus:
          file.processingStatus ?? (ragId ? "COMPLETE" : "PROCESSING"),
        ragId,
      };
    }),
  );

  return (
    <NotebookAgentActivityInline
      key={activityPanelMode}
      toolCalls={toolCallsWithDocumentContext}
      isRunning={isGeneratingOutline}
      selectedChunks={selectedChunks}
      defaultExpanded={activityPanelMode === "running-active"}
      onOpenDocumentContext={onOpenFileProcessor}
    />
  );
}
