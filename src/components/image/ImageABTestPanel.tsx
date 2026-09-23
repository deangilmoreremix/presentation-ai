"use client";

import * as React from "react";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Play,
  Pause,
  Square,
  BarChart3,
  GitCompare,
  Check,
  X,
  Loader2,
  Trophy,
} from "lucide-react";
import { usePresentationState } from "@/states/presentation-state";
import { getAvailableImageModels, GPT_IMAGE_SIZES, IMAGE_QUALITIES, IMAGE_BACKGROUNDS, type ImageModelList } from "@/constants/image-models";
import { type ImageModel } from "@/lib/image/types";

interface ImageABTestPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: any | null;
  onEntryChange: (entry: any | null) => void;
}

export function ImageABTestPanel({ open, onOpenChange, entry, onEntryChange }: ImageABTestPanelProps) {
  const { addImageABTest, imageABTests, setImageABTests } = usePresentationState();
  const [modelA, setModelA] = useState<ImageModelList>("openai/gpt-image-2.5-flare");
  const [modelB, setModelB] = useState<ImageModelList>("openai/gpt-image-2.5-sunburst");
  const [promptA, setPromptA] = useState("");
  const [promptB, setPromptB] = useState("");
  const [size, setSize] = useState("1536x1024");
  const [quality, setQuality] = useState("high");
  const [background, setBackground] = useState("opaque");
  const [isRunning, setIsRunning] = useState(false);
  const [status, setStatus] = useState<"idle" | "running" | "completed" | "failed">("idle");
  const [progress, setProgress] = useState(0);
  const [resultA, setResultA] = useState<{ url?: string; latencyMs?: number } | undefined>();
  const [resultB, setResultB] = useState<{ url?: string; latencyMs?: number } | undefined>();
  const [winner, setWinner] = useState<"A" | "B" | "tie" | undefined>();

  const availableModels = useMemo(() => getAvailableImageModels(true), []);

  const startTest = async () => {
    if (!promptA.trim() || !promptB.trim()) return;
    setIsRunning(true);
    setStatus("running");
    setProgress(0);
    setResultA(undefined);
    setResultB(undefined);
    setWinner(undefined);

    const testId = `ab_${Date.now()}`;
    const newEntry = {
      id: testId,
      sessionId: "current",
      modelA,
      modelB,
      promptA,
      promptB,
      status: "running",
      createdAt: new Date(),
    };

    onEntryChange(newEntry);
    addImageABTest(newEntry);

    // Simulate parallel generation (in production, this would call the actual generation actions)
    try {
      const startTime = Date.now();

      // Model A
      await new Promise((resolve) => setTimeout(resolve, 500));
      setProgress(30);
      const mockResultA = {
        url: `https://picsum.photos/seed/${testId}_a/1536/1024`,
        latencyMs: Date.now() - startTime,
      };
      setResultA(mockResultA);
      setProgress(60);

      // Model B
      await new Promise((resolve) => setTimeout(resolve, 500));
      const mockResultB = {
        url: `https://picsum.photos/seed/${testId}_b/1536/1024`,
        latencyMs: Date.now() - startTime + 300,
      };
      setResultB(mockResultB);
      setProgress(100);

      // Determine winner based on latency
      if (mockResultA.latencyMs && mockResultB.latencyMs) {
        if (mockResultA.latencyMs < mockResultB.latencyMs) {
          setWinner("A");
        } else if (mockResultB.latencyMs < mockResultA.latencyMs) {
          setWinner("B");
        } else {
          setWinner("tie");
        }
      }

      setStatus("completed");
      setIsRunning(false);

      // Update the entry with results
      const updatedEntry = {
        ...newEntry,
        resultA: mockResultA,
        resultB: mockResultB,
        winner,
        status: "completed" as const,
      };
      onEntryChange(updatedEntry);
      setImageABTests([...imageABTests, updatedEntry]);
    } catch (error) {
      setStatus("failed");
      setIsRunning(false);
    }
  };

  const stopTest = () => {
    setIsRunning(false);
    setStatus("idle");
    setProgress(0);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitCompare className="h-4 w-4" />
          <span className="text-sm font-medium">A/B Testing</span>
          {winner && (
            <Badge variant={winner === "A" ? "default" : winner === "B" ? "secondary" : "outline"}>
              {winner === "tie" ? "Tie" : `Model ${winner} wins`}
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => onOpenChange(false)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {status === "running" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Running A/B test...</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} />
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {/* Model A */}
        <div className="space-y-3 rounded-lg border p-3">
          <div className="flex items-center justify-between">
            <Badge variant="outline">Model A</Badge>
            {winner === "A" && <Trophy className="h-4 w-4 text-yellow-500" />}
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Model</Label>
            <Select value={modelA} onValueChange={(v) => setModelA(v as ImageModelList)} disabled={isRunning}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableModels.map((model) => (
                  <SelectItem key={model.value} value={model.value}>
                    {model.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Prompt</Label>
            <Textarea
              placeholder="Prompt for Model A"
              className="min-h-16 text-xs"
              value={promptA}
              onChange={(e) => setPromptA(e.target.value)}
              disabled={isRunning}
            />
          </div>
          {resultA && (
            <div className="space-y-2">
              <Label className="text-xs">Result</Label>
              <div className="relative overflow-hidden rounded-lg border">
                <img src={resultA.url} alt="Model A result" className="h-32 w-full object-cover" />
                <Badge className="absolute top-2 right-2 text-[10px]">
                  {resultA.latencyMs}ms
                </Badge>
              </div>
            </div>
          )}
        </div>

        {/* Model B */}
        <div className="space-y-3 rounded-lg border p-3">
          <div className="flex items-center justify-between">
            <Badge variant="outline">Model B</Badge>
            {winner === "B" && <Trophy className="h-4 w-4 text-yellow-500" />}
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Model</Label>
            <Select value={modelB} onValueChange={(v) => setModelB(v as ImageModelList)} disabled={isRunning}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableModels.map((model) => (
                  <SelectItem key={model.value} value={model.value}>
                    {model.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Prompt</Label>
            <Textarea
              placeholder="Prompt for Model B"
              className="min-h-16 text-xs"
              value={promptB}
              onChange={(e) => setPromptB(e.target.value)}
              disabled={isRunning}
            />
          </div>
          {resultB && (
            <div className="space-y-2">
              <Label className="text-xs">Result</Label>
              <div className="relative overflow-hidden rounded-lg border">
                <img src={resultB.url} alt="Model B result" className="h-32 w-full object-cover" />
                <Badge className="absolute top-2 right-2 text-[10px]">
                  {resultB.latencyMs}ms
                </Badge>
              </div>
            </div>
          )}
        </div>
      </div>

      <Separator />

      {/* Shared settings */}
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-2">
          <Label className="text-xs">Size</Label>
          <Select value={size} onValueChange={setSize} disabled={isRunning}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GPT_IMAGE_SIZES.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Quality</Label>
          <Select value={quality} onValueChange={setQuality} disabled={isRunning}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {IMAGE_QUALITIES.map((q) => (
                <SelectItem key={q} value={q}>{q}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Background</Label>
          <Select value={background} onValueChange={setBackground} disabled={isRunning}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {IMAGE_BACKGROUNDS.map((bg) => (
                <SelectItem key={bg} value={bg}>{bg}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {!isRunning ? (
            <Button onClick={startTest} disabled={!promptA.trim() || !promptB.trim()}>
              <Play className="mr-2 h-4 w-4" />
              Start Test
            </Button>
          ) : (
            <Button variant="destructive" onClick={stopTest}>
              <Square className="mr-2 h-4 w-4" />
              Stop
            </Button>
          )}
        </div>
        {status === "completed" && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => {
                setStatus("idle");
                setProgress(0);
                setResultA(undefined);
                setResultB(undefined);
                setWinner(undefined);
                onEntryChange(null);
              }}
            >
              <X className="mr-2 h-3 w-3" />
              Reset
            </Button>
          </div>
        )}
      </div>

      {/* Past tests */}
      {imageABTests.length > 0 && (
        <>
          <Separator />
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <BarChart3 className="h-4 w-4" />
              Past Tests
            </div>
            <ScrollArea className="h-32">
              <div className="space-y-2">
                {imageABTests.map((test: any) => (
                  <div key={test.id} className="flex items-center justify-between rounded-lg border p-2">
                    <div>
                      <p className="text-xs font-medium">Test {test.id.slice(-6)}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {test.modelA} vs {test.modelB}
                      </p>
                    </div>
                    {test.winner && (
                      <Badge variant={test.winner === "tie" ? "outline" : "default"} className="text-[10px]">
                        {test.winner === "tie" ? "Tie" : `${test.winner} wins`}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </>
      )}
    </div>
  );
}
