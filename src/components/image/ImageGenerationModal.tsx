"use client";

import * as React from "react";
import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Loader2,
  Sparkles,
  Wand2,
  ImagePlus,
  RefreshCw,
  Download,
  ChevronRight,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  GitBranch,
  Layers,
  Palette,
  Box,
  Type,
  PenTool,
  Eraser,
  Upload,
  Trash2,
  Check,
  X,
  Settings2,
  Zap,
  Clock,
  BarChart3,
  History,
  GitCompare,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { useMediaQuery } from "@/hooks/globals/useMediaQuery";
import { usePresentationState } from "@/states/presentation-state";
import { generateImageAction, generateImageStreamAction } from "@/app/_actions/apps/image-studio/generate";
import { getApiKey } from "@/lib/key-storage";
import { useToast } from "@/components/ui/use-toast";
import { ImageHistoryPanel } from "./ImageHistoryPanel";
import { ImageMaskEditor } from "./ImageMaskEditor";
import { ImageABTestPanel } from "./ImageABTestPanel";
import { ImageReferenceUploader } from "./ImageReferenceUploader";
import {
  type ImageModelList,
  type ImageAspectRatio,
  getAvailableImageModels,
  GPT_IMAGE_SIZES,
  IMAGE_QUALITIES,
  IMAGE_BACKGROUNDS,
  OUTPUT_FORMATS,
  IMAGE_COUNTS,
  getGptImageSizeLabel,
  parseCustomImageSize,
  isValidGptImageSize,
  DEFAULT_IMAGE_MODEL,
} from "@/constants/image-models";
import {
  type ImageGenerationMode,
  type ImageQuality,
  type ImageBackground,
  type ImageMaskData,
  type ImageReference,
  type ImageABTestEntry,
  type ImageStreamChunk,
  type OutputFormat,
} from "@/lib/image/types";

interface ImageGenerationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImageSelect: (url: string, prompt: string) => void;
  initialPrompt?: string;
  initialMode?: ImageGenerationMode;
  previousResponseId?: string;
  referenceImages?: ImageReference[];
  maskData?: ImageMaskData | null;
}

const ART_STYLES = [
  { id: "none", label: "None", value: "", description: "No style modifier" },
  {
    id: "photorealistic",
    label: "Photorealistic",
    value: "photorealistic, highly detailed, 8k",
    description: "Realistic photos",
  },
  {
    id: "illustration",
    label: "Illustration",
    value: "illustration, vector art, flat style",
    description: "Flat vector art",
  },
  {
    id: "3d-render",
    label: "3D Render",
    value: "3d render, unreal engine 5, octane render",
    description: "3D rendered",
  },
  { id: "abstract", label: "Abstract", value: "abstract, artistic, colorful", description: "Abstract art" },
  {
    id: "watercolor",
    label: "Watercolor",
    value: "watercolor painting, artistic, soft colors",
    description: "Watercolor style",
  },
  {
    id: "cyberpunk",
    label: "Cyberpunk",
    value: "cyberpunk, neon lights, futuristic",
    description: "Neon futuristic",
  },
  { id: "anime", label: "Anime", value: "anime style, studio ghibli, vibrant", description: "Anime style" },
  {
    id: "oil-painting",
    label: "Oil Painting",
    value: "oil painting, textured, canvas",
    description: "Oil on canvas",
  },
  {
    id: "pixel-art",
    label: "Pixel Art",
    value: "pixel art, 16-bit, retro gaming",
    description: "Retro pixel",
  },
  {
    id: "comic",
    label: "Comic Book",
    value: "comic book style, bold outlines, halftone dots",
    description: "Comic book",
  },
  {
    id: "sketch",
    label: "Sketch",
    value: "pencil sketch, hand-drawn, rough lines",
    description: "Hand drawn",
  },
];

const PROMPT_TEMPLATES = [
  {
    id: "blank",
    label: "Blank",
    prompt: "",
  },
  {
    id: "photorealism",
    label: "Photorealism",
    prompt: "Photorealistic image of",
  },
  {
    id: "infographic",
    label: "Infographic",
    prompt: "Clean infographic explaining",
  },
  {
    id: "text-render",
    label: "Text Rendering",
    prompt: "Image with clearly readable text:",
  },
  {
    id: "logo",
    label: "Logo",
    prompt: "Minimal vector logo for",
  },
  {
    id: "ui-mockup",
    label: "UI Mockup",
    prompt: "UI mockup of",
  },
  {
    id: "comic",
    label: "Comic",
    prompt: "Comic book panel showing",
  },
  {
    id: "scientific",
    label: "Scientific",
    prompt: "Scientific diagram of",
  },
];

const SIZE_PRESETS = [
  { label: "Square 1024", value: "1024x1024" },
  { label: "Square 2048", value: "2048x2048" },
  { label: "Landscape 1536", value: "1536x1024" },
  { label: "Landscape 2048", value: "2048x1152" },
  { label: "Landscape 4K", value: "3840x2160" },
  { label: "Portrait 1024", value: "1024x1536" },
  { label: "Portrait 2160", value: "2160x3840" },
];

export function ImageGenerationModal({
  open,
  onOpenChange,
  onImageSelect,
  initialPrompt = "",
  initialMode = "generate",
  previousResponseId,
  referenceImages: initialReferenceImages = [],
  maskData: initialMaskData = null,
}: ImageGenerationModalProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const { toast } = useToast();
  const { imageModel, setImageModel } = usePresentationState();

  // Core generation state
  const [prompt, setPrompt] = useState(initialPrompt);
  const [selectedModel, setSelectedModel] = useState<ImageModelList>(imageModel || DEFAULT_IMAGE_MODEL);
  const [size, setSize] = useState<string>("1024x1024");
  const [customSize, setCustomSize] = useState("");
  const [quality, setQuality] = useState<ImageQuality>("auto");
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("png");
  const [outputCompression, setOutputCompression] = useState<number>(80);
  const [background, setBackground] = useState<ImageBackground>("opaque");
  const [mode, setMode] = useState<ImageGenerationMode>(initialMode);
  const [imageCount, setImageCount] = useState(1);
  const [streamEnabled, setStreamEnabled] = useState(false);
  const [partialImages, setPartialImages] = useState(2);
  const [aspectRatio, setAspectRatio] = useState<ImageAspectRatio>("16:9");
  const [inputFidelity, setInputFidelity] = useState<"high" | "low" | undefined>(undefined);
  const [moderation, setModeration] = useState<"low" | "auto" | undefined>(undefined);

  // Advanced state
  const [selectedStyle, setSelectedStyle] = useState(ART_STYLES[0]?.id);
  const [selectedTemplate, setSelectedTemplate] = useState(PROMPT_TEMPLATES[0]?.id);
  const [referenceImages, setReferenceImages] = useState<ImageReference[]>(initialReferenceImages);
  const [maskData, setMaskData] = useState<ImageMaskData | null>(initialMaskData);
  const [showHistory, setShowHistory] = useState(false);
  const [showMaskEditor, setShowMaskEditor] = useState(false);
  const [showABTest, setShowABTest] = useState(false);
  const [abTestEntry, setABTestEntry] = useState<ImageABTestEntry | null>(null);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<Array<{ url: string; prompt: string }>>([]);
  const [localError, setLocalError] = useState<string | null>(null);
  const [streamChunks, setStreamChunks] = useState<ImageStreamChunk[]>([]);
  const [streamProgress, setStreamProgress] = useState(0);
  const [currentResponseId, setCurrentResponseId] = useState<string | undefined>(previousResponseId);

  const activeSize = customSize || size;

  const buildFullPrompt = useCallback(() => {
    const styleSuffix = ART_STYLES.find((s) => s.id === selectedStyle)?.value || "";
    const templatePrompt = PROMPT_TEMPLATES.find((t) => t.id === selectedTemplate)?.prompt || "";
    const parts = [templatePrompt, prompt.trim(), styleSuffix].filter(Boolean);
    return parts.join(", ");
  }, [prompt, selectedStyle, selectedTemplate]);

  const handleGenerate = async () => {
    if (!prompt.trim() && !initialPrompt) return;

    setLocalError(null);
    setIsGenerating(true);
    setGeneratedImages([]);
    setStreamChunks([]);
    setStreamProgress(0);

    try {
      const fullPrompt = buildFullPrompt();

      if (streamEnabled) {
        const result = await generateImageStreamAction(
          fullPrompt,
          selectedModel,
          aspectRatio,
          getApiKey() ?? undefined,
          {
            size: activeSize,
            quality,
            outputFormat,
            background,
            mode,
            previousResponseId: currentResponseId,
            inputFidelity,
            moderation,
            partialImages: streamEnabled ? partialImages : undefined,
            referenceImages: referenceImages.map((r) => ({ url: r.url, role: r.role })),
            mask: maskData
              ? {
                  url: maskData.url,
                  x: maskData.x,
                  y: maskData.y,
                  width: maskData.width,
                  height: maskData.height,
                }
              : undefined,
            onProgress: (chunk) => {
              setStreamProgress(chunk.progress);
              setStreamChunks((prev) => [
                ...prev,
                {
                  id: `chunk_${Date.now()}`,
                  sessionId: "current",
                  type: "progress",
                  progress: chunk.progress,
                  message: chunk.message,
                  timestamp: new Date(),
                },
              ]);
            },
          },
        );

        if (result.success && result.image) {
          setGeneratedImages([{ url: result.image.url, prompt: fullPrompt }]);
          setCurrentResponseId(result.previousResponseId);
        } else {
          setLocalError((result as { success: boolean; error?: string }).error || "Streaming generation failed");
        }
      } else {
        const promises = Array(imageCount)
          .fill(null)
          .map(() =>
            generateImageAction(
              fullPrompt,
              selectedModel,
              aspectRatio,
              getApiKey() ?? undefined,
              {
                size: activeSize,
                quality,
                outputFormat,
                outputCompression,
                background,
                mode,
                previousResponseId: currentResponseId,
                inputFidelity,
                moderation,
                referenceImages: referenceImages.map((r) => ({ url: r.url, role: r.role })),
                mask: maskData
                  ? {
                      url: maskData.url,
                      x: maskData.x,
                      y: maskData.y,
                      width: maskData.width,
                      height: maskData.height,
                    }
                  : undefined,
              },
            ),
          );

        const results = await Promise.all(promises);
        const successfulImages: Array<{ url: string; prompt: string }> = [];
        let firstError: string | undefined;

        for (const result of results) {
          const genResult = result as { success: boolean; image?: { url: string }; responseId?: string; error?: string };
          if (genResult.success && genResult.image) {
            successfulImages.push({ url: genResult.image.url, prompt: fullPrompt });
            if (genResult.responseId) setCurrentResponseId(genResult.responseId);
          } else if (!firstError && genResult.error) {
            firstError = genResult.error;
          }
        }

        if (successfulImages.length > 0) {
          setGeneratedImages(successfulImages);
        } else {
          setLocalError(firstError || "Failed to generate images");
        }
      }
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "Failed to generate image");
    } finally {
      setIsGenerating(false);
    }
  };

  const ModalContent = () => (
    <div className="flex h-full flex-col space-y-4">
      {localError && (
        <Alert variant="destructive">
          <AlertDescription>{localError}</AlertDescription>
        </Alert>
      )}

      <Tabs value={mode} onValueChange={(v) => setMode(v as ImageGenerationMode)} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="generate" className="gap-2">
            <Sparkles className="h-4 w-4" />
            Generate
          </TabsTrigger>
          <TabsTrigger value="edit" className="gap-2">
            <Wand2 className="h-4 w-4" />
            Edit
          </TabsTrigger>
          <TabsTrigger value="edit-mask" className="gap-2">
            <PenTool className="h-4 w-4" />
            Mask Edit
          </TabsTrigger>
          <TabsTrigger value="style-transfer" className="gap-2">
            <Palette className="h-4 w-4" />
            Style
          </TabsTrigger>
        </TabsList>

        <TabsContent value={mode} className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Left Column - Prompt & Templates */}
            <div className="space-y-4">
              {/* Prompt Templates */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">Template</Label>
                <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROMPT_TEMPLATES.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Prompt */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">Prompt</Label>
                <Textarea
                  placeholder="Describe the image you want to create..."
                  className="min-h-24 resize-none text-sm"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  disabled={isGenerating}
                />
              </div>

              {/* Art Style */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">Art Style</Label>
                <div className="grid grid-cols-3 gap-1">
                  {ART_STYLES.slice(0, 6).map((style) => (
                    <Button
                      key={style.id}
                      variant={selectedStyle === style.id ? "default" : "outline"}
                      size="sm"
                      className="h-7 justify-start px-2 text-xs"
                      onClick={() => setSelectedStyle(style.id)}
                    >
                      {style.label}
                    </Button>
                  ))}
                </div>
                <Select value={selectedStyle} onValueChange={setSelectedStyle}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="More styles" />
                  </SelectTrigger>
                  <SelectContent>
                    {ART_STYLES.map((style) => (
                      <SelectItem key={style.id} value={style.id}>
                        {style.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Reference Images */}
              {(mode === "edit" || mode === "style-transfer") && (
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Reference Images</Label>
                  <ImageReferenceUploader
                    images={referenceImages}
                    onImagesChange={setReferenceImages}
                    disabled={isGenerating}
                  />
                </div>
              )}

              {/* Mask Editor */}
              {(mode === "edit-mask" || mode === "object-removal" || mode === "background-removal") && (
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Mask</Label>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => setShowMaskEditor(true)}
                    >
                      <PenTool className="mr-2 h-3 w-3" />
                      Draw Mask
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => setMaskData(null)}
                      disabled={!maskData}
                    >
                      <Eraser className="mr-2 h-3 w-3" />
                      Clear
                    </Button>
                  </div>
                  {maskData && (
                    <Badge variant="secondary" className="text-xs">
                      Mask active: {maskData.width ?? "?"}x{maskData.height ?? "?"} at ({maskData.x ?? 0}, {maskData.y ?? 0})
                    </Badge>
                  )}
                </div>
              )}
            </div>

            {/* Right Column - Settings */}
            <div className="space-y-4">
              {/* Model */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">Model</Label>
                <Select value={selectedModel} onValueChange={(v) => setSelectedModel(v as ImageModelList)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableImageModels(true).map((model) => (
                      <SelectItem key={model.value} value={model.value}>
                        <div className="flex flex-col">
                          <span>{model.label}</span>
                          {model.description && (
                            <span className="text-xs text-muted-foreground">{model.description}</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Size */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">Size</Label>
                <Select value={size} onValueChange={setSize}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SIZE_PRESETS.map((preset) => (
                      <SelectItem key={preset.value} value={preset.value}>
                        {preset.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Custom WxH (e.g. 2048x1152)"
                  className="h-8 text-xs"
                  value={customSize}
                  onChange={(e) => setCustomSize(e.target.value)}
                  disabled={isGenerating}
                />
                <p className="text-[10px] text-muted-foreground">
                  Multiples of 16, max 3840, total pixels 655k-8.2M
                </p>
              </div>

              {/* Quality */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">Quality</Label>
                <Select value={quality} onValueChange={(v) => setQuality(v as ImageQuality)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {IMAGE_QUALITIES.map((q) => (
                      <SelectItem key={q} value={q}>
                        {q === "xhigh" ? "Extra High" : q === "max" ? "Max" : q.charAt(0).toUpperCase() + q.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Background */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">Background</Label>
                <Select value={background} onValueChange={(v) => setBackground(v as ImageBackground)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {IMAGE_BACKGROUNDS.map((bg) => (
                      <SelectItem key={bg} value={bg}>
                        {bg === "auto" ? "Auto" : bg.charAt(0).toUpperCase() + bg.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Output Format */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">Format</Label>
                <Select value={outputFormat} onValueChange={(v) => setOutputFormat(v as OutputFormat)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OUTPUT_FORMATS.map((format) => (
                      <SelectItem key={format} value={format}>
                        {format.toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Compression */}
              {outputFormat !== "png" && (
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Compression: {outputCompression}%</Label>
                  <Slider
                    value={[outputCompression]}
                    onValueChange={([v]) => setOutputCompression(v ?? 80)}
                    min={10}
                    max={100}
                    step={5}
                    disabled={isGenerating}
                  />
                </div>
              )}

              {/* Image Count */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">Count</Label>
                <Select value={imageCount.toString()} onValueChange={(v) => setImageCount(parseInt(v, 10))}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {IMAGE_COUNTS.map((count) => (
                      <SelectItem key={count} value={count.toString()}>
                        {count}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Input Fidelity */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">Input Fidelity</Label>
                <Select value={inputFidelity} onValueChange={(v) => setInputFidelity(v === "" ? undefined : v as "high" | "low")}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Auto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Auto</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Moderation */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground">Moderation</Label>
                <Select value={moderation} onValueChange={(v) => setModeration(v === "" ? undefined : v as "low" | "auto")}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Auto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Auto</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Streaming */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-xs font-medium text-muted-foreground">Stream</Label>
                  <p className="text-[10px] text-muted-foreground">Progressive preview</p>
                </div>
                <Switch checked={streamEnabled} onCheckedChange={setStreamEnabled} disabled={isGenerating} />
              </div>

              {streamEnabled && (
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Partial Images</Label>
                  <Select value={partialImages.toString()} onValueChange={(v) => setPartialImages(parseInt(v, 10))}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[0, 1, 2, 3].map((count) => (
                        <SelectItem key={count} value={count.toString()}>
                          {count}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Advanced Toggles */}
              <Separator />
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setShowHistory(true)}
                >
                  <History className="mr-2 h-3 w-3" />
                  History
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setShowABTest(true)}
                >
                  <GitCompare className="mr-2 h-3 w-3" />
                  A/B Test
                </Button>
              </div>
            </div>
          </div>

          {/* Stream Progress */}
          {streamEnabled && isGenerating && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Generating...</span>
                <span>{streamProgress}%</span>
              </div>
              <Progress value={streamProgress} />
            </div>
          )}

          {/* Generate Button */}
          <Button
            className="w-full"
            onClick={handleGenerate}
            disabled={isGenerating || (!prompt.trim() && !initialPrompt)}
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate
              </>
            )}
          </Button>

          {/* Results */}
          {generatedImages.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {generatedImages.map((img, idx) => (
                <div
                  key={idx}
                  className="group relative overflow-hidden rounded-lg border-2 border-primary shadow-md"
                >
                  <img
                    src={img.url}
                    alt={img.prompt}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                  <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 backdrop-blur-[1px] transition-opacity group-hover:opacity-100">
                    <Button
                      size="icon"
                      variant="secondary"
                      className="h-8 w-8 rounded-full shadow-lg"
                      onClick={() => onImageSelect(img.url, img.prompt)}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="secondary"
                      className="h-8 w-8 rounded-full shadow-lg"
                      onClick={() => window.open(img.url, "_blank")}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Panels */}
      {showHistory && (
        <ImageHistoryPanel
          open={showHistory}
          onOpenChange={setShowHistory}
          sessionId="current"
        />
      )}
      {showMaskEditor && (
        <ImageMaskEditor
          open={showMaskEditor}
          onOpenChange={setShowMaskEditor}
          maskData={maskData}
          onMaskChange={setMaskData}
        />
      )}
      {showABTest && (
        <ImageABTestPanel
          open={showABTest}
          onOpenChange={setShowABTest}
          entry={abTestEntry}
          onEntryChange={setABTestEntry}
        />
      )}
    </div>
  );

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Image Generation</DialogTitle>
            <DialogDescription>
              Create images with GPT Image 2.5
            </DialogDescription>
          </DialogHeader>
          <ModalContent />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader>
          <DrawerTitle>Image Generation</DrawerTitle>
          <DrawerDescription>
            Create images with GPT Image 2.5
          </DrawerDescription>
        </DrawerHeader>
        <ScrollArea className="h-full px-4">
          <ModalContent />
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
}
