"use client";

import * as React from "react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ImagePlus,
  Trash2,
  RotateCcw,
  GitBranch,
  ChevronRight,
  History,
  Check,
  X,
} from "lucide-react";
import { usePresentationState } from "@/states/presentation-state";
import { type ImageHistoryEntry, type ImageGenerationSession } from "@/lib/image/types";

interface ImageHistoryPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
}

export function ImageHistoryPanel({ open, onOpenChange, sessionId }: ImageHistoryPanelProps) {
  const { imageGenerationHistory, setImageGenerationHistory, addImageGenerationHistoryEntry, clearImageGenerationHistory, currentImageGenerationSession, setCurrentImageGenerationSession } = usePresentationState();

  const history = useMemo(() => {
    return imageGenerationHistory[sessionId] || [];
  }, [imageGenerationHistory, sessionId]);

  const session: ImageGenerationSession | undefined = useMemo(() => {
    if (!currentImageGenerationSession || currentImageGenerationSession.id !== sessionId) {
      const mappedEntries = history.map((entry: ImageHistoryEntry, index: number) => ({
        id: entry.id,
        entries: history.slice(0, index + 1),
        currentEntryId: entry.id,
        branches: { main: history.slice(0, index + 1).map((e: ImageHistoryEntry) => e.id) },
        activeBranch: "main",
        createdAt: history[0]?.createdAt || new Date(),
        updatedAt: entry.createdAt,
      }));
      return mappedEntries[mappedEntries.length - 1];
    }
    return currentImageGenerationSession as ImageGenerationSession | undefined;
  }, [currentImageGenerationSession, history, sessionId]);

  const handleRestore = (entry: ImageHistoryEntry) => {
    // In a full implementation, this would restore the generation state to this point
    onOpenChange(false);
  };

  const handleBranch = (entry: ImageHistoryEntry) => {
    const branchName = `branch_${Date.now()}`;
    const newSession: ImageGenerationSession = {
      id: sessionId,
      entries: [...(session?.entries || []), entry],
      currentEntryId: entry.id,
      branches: {
        ...(session?.branches || {}),
        [branchName]: [...(session?.branches?.main || []), entry.id],
      },
      activeBranch: branchName,
      createdAt: session?.createdAt || new Date(),
      updatedAt: new Date(),
    };
    setCurrentImageGenerationSession(newSession);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4" />
          <span className="text-sm font-medium">Generation History</span>
          <Badge variant="secondary">{history.length}</Badge>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => clearImageGenerationHistory(sessionId)}
            disabled={history.length === 0}
          >
            <Trash2 className="mr-2 h-3 w-3" />
            Clear
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="h-64">
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
            <History className="mb-2 h-8 w-8 opacity-50" />
            <p className="text-sm">No generation history yet</p>
            <p className="text-xs">Generate images to see them here</p>
          </div>
        ) : (
          <div className="space-y-2">
            {history.map((entry: ImageHistoryEntry, index: number) => (
              <div
                key={entry.id}
                className="flex items-center gap-3 rounded-lg border p-2 transition-colors hover:bg-muted/50"
              >
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md border">
                  <img
                    src={entry.url}
                    alt={entry.prompt}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{entry.prompt}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">
                      {entry.model}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {entry.size}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {entry.createdAt.toLocaleTimeString()}
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleRestore(entry)}
                    title="Restore"
                  >
                    <RotateCcw className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleBranch(entry)}
                    title="Branch from here"
                  >
                    <GitBranch className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {session && Object.keys(session.branches).length > 1 && (
        <>
          <Separator />
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <GitBranch className="h-4 w-4" />
              Branches
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.keys(session.branches).map((branchName) => (
                <Button
                  key={branchName}
                  variant={session.activeBranch === branchName ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => {
                    const updatedSession = { ...session, activeBranch: branchName };
                    setCurrentImageGenerationSession(updatedSession);
                  }}
                >
                  {branchName === "main" ? "Main" : branchName}
                  {session.activeBranch === branchName && <Check className="ml-2 h-3 w-3" />}
                </Button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
