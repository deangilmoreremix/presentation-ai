"use client";

import * as React from "react";
import { useRef, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, ImageIcon, Download, KeyRound, Edit3, Sparkles, Wand2, AlertTriangle } from "lucide-react";
import { useAuth } from "@/components/supabase-provider";
import { useApiKey } from "@/hooks/use-api-key";
import type {
  ImageModel,
  GptImageSize,
  ImageQuality,
  OutputFormat,
  ImageBackground,
  ImageCategory,
} from "@/lib/image/types";

// Category definitions with labels
const CATEGORIES: { id: ImageCategory; label: string; icon: string }[] = [
  { id: "core", label: "Core Creation", icon: "🎨" },
  { id: "marketing", label: "Marketing & Ads", icon: "📢" },
  { id: "branding", label: "Branding & Identity", icon: "🏷️" },
  { id: "product", label: "Product & Ecommerce", icon: "🛍️" },
  { id: "content", label: "Content Creation", icon: "📱" },
  { id: "editing", label: "Editing", icon: "✂️" },
  { id: "composition", label: "Composition", icon: "🖼️" },
  { id: "consistency", label: "Consistency", icon: "🔗" },
  { id: "ui-ux", label: "UI/UX & Web", icon: "💻" },
  { id: "educational", label: "Educational", icon: "📚" },
  { id: "storytelling", label: "Storytelling", icon: "📖" },
  { id: "real-estate", label: "Real Estate", icon: "🏠" },
  { id: "fashion", label: "Fashion & Lifestyle", icon: "👗" },
  { id: "automation", label: "Automation Workflows", icon: "⚙️" },
  { id: "saas-products", label: "SaaS Products", icon: "🚀" },
];

// Image models
const IMAGE_MODELS: ImageModel[] = ["gpt-image-1", "gpt-image-1-mini", "gpt-image-1.5", "dall-e-3", "dall-e-2"];

// Sizes
const IMAGE_SIZES: GptImageSize[] = ["1024x1024", "1536x1024", "1024x1536", "auto"];

// Qualities
const IMAGE_QUALITIES: ImageQuality[] = ["low", "medium", "high", "auto"];

// Formats
const OUTPUT_FORMATS: OutputFormat[] = ["png", "jpeg", "webp"];

// Models for the Responses API
const RESPONSES_MODELS = ["gpt-4o", "gpt-4o-mini", "gpt-4.1", "o3"] as const;
type ResponsesModel = (typeof RESPONSES_MODELS)[number];

const REASONING_EFFORTS = ["low", "medium", "high"] as const;
type ReasoningEffort = (typeof REASONING_EFFORTS)[number];

const INPUT_FIDELITY_OPTIONS = ["low", "high"] as const;
type InputFidelity = (typeof INPUT_FIDELITY_OPTIONS)[number];

const MODERATION_OPTIONS = ["auto", "low"] as const;
type ModerationLevel = (typeof MODERATION_OPTIONS)[number];

type StudioMode = "generate" | "edit" | "refine";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  images?: string[];
  responseId?: string;
}

interface ImageStudioProps {
  initialCategory?: ImageCategory;
  onImageGenerated?: (images: any[]) => void;
}

/**
 * AI Image Studio - Full-featured image generation, edit and Responses API interface.
 */
export function ImageStudio({ initialCategory = "core", onImageGenerated }: ImageStudioProps) {
  const { user } = useAuth();
  const { apiKey } = useApiKey();
  const [mode, setMode] = useState<StudioMode>("generate");

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <ApiKeyBanner apiKey={apiKey} />

      <Tabs value={mode} onValueChange={(v) => setMode(v as StudioMode)}>
        <TabsList className="grid w-full max-w-2xl grid-cols-3">
          <TabsTrigger value="generate" className="gap-2">
            <Sparkles className="h-4 w-4" />
            Generate
          </TabsTrigger>
          <TabsTrigger value="edit" className="gap-2" data-tab-trigger="edit">
            <Edit3 className="h-4 w-4" />
            Edit
          </TabsTrigger>
          <TabsTrigger value="refine" className="gap-2">
            <Wand2 className="h-4 w-4" />
            Refine (Responses API)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="mt-4">
          <GenerateMode
            apiKey={apiKey}
            hasUser={!!user}
            initialCategory={initialCategory}
            onImageGenerated={onImageGenerated}
          />
        </TabsContent>

        <TabsContent value="edit" className="mt-4">
          <EditMode apiKey={apiKey} hasUser={!!user} />
        </TabsContent>

        <TabsContent value="refine" className="mt-4">
          <RefineMode apiKey={apiKey} hasUser={!!user} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ApiKeyBanner({ apiKey }: { apiKey: string | null }) {
  if (apiKey) return null;
  return (
    <Alert>
      <KeyRound className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between gap-4">
        <span>Set your OpenAI API key in Settings to start generating.</span>
        <Button asChild size="sm" variant="outline">
          <Link href="/settings">Go to Settings</Link>
        </Button>
      </AlertDescription>
    </Alert>
  );
}

/* ---------------- Shared helpers ---------------- */

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}

/**
 * Attempt streaming via `/api/image/<path>/stream`. If not available (404), fall back to non-stream route.
 * Resolves with the final non-stream response if streaming is unavailable.
 */
async function tryStream<T>(
  url: string,
  init: RequestInit,
  onEvent: (evt: { event: string; data: any }) => void,
): Promise<{ ok: boolean; status: number; data: T } | null> {
  try {
    const res = await fetch(url, init);
    if (res.status === 404 || !res.body) return null;
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `Request failed (${res.status})`);
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let finalData: T | null = null;
    // Read SSE stream
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let idx;
      while ((idx = buffer.indexOf("\n\n")) !== -1) {
        const chunk = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        const evt = parseSseEvent(chunk);
        if (evt) {
          onEvent(evt);
          if (evt.event === "done" || evt.event === "complete" || evt.event === "final") {
            finalData = evt.data as T;
          } else if (evt.event === "error") {
            throw new Error(evt.data?.error || "Streaming error");
          }
        }
      }
    }
    if (finalData) return { ok: true, status: 200, data: finalData };
    return { ok: true, status: 200, data: null as unknown as T };
  } catch (err) {
    if (err instanceof Error && /404/.test(err.message)) return null;
    throw err;
  }
}

function parseSseEvent(chunk: string): { event: string; data: any } | null {
  let event = "message";
  const dataLines: string[] = [];
  for (const line of chunk.split("\n")) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
  }
  if (dataLines.length === 0) return null;
  const dataStr = dataLines.join("\n");
  let data: any = dataStr;
  try {
    data = JSON.parse(dataStr);
  } catch {
    // leave as string
  }
  return { event, data };
}

/* ---------------- Generate mode ---------------- */

interface GenerateModeProps {
  apiKey: string | null;
  hasUser: boolean;
  initialCategory: ImageCategory;
  onImageGenerated?: (images: any[]) => void;
}

function GenerateMode({ apiKey, hasUser, initialCategory, onImageGenerated }: GenerateModeProps) {
  const [prompt, setPrompt] = useState("");
  const [category, setCategory] = useState<ImageCategory>(initialCategory);
  const [model, setModel] = useState<ImageModel>("gpt-image-1");
  const [size, setSize] = useState<GptImageSize>("1024x1024");
  const [quality, setQuality] = useState<ImageQuality>("high");
  const [format, setFormat] = useState<OutputFormat>("png");
  const [compression, setCompression] = useState<number>(90);
  const [background, setBackground] = useState<ImageBackground>("opaque");
  const [n, setN] = useState(1);
  const [stream, setStream] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim() || !hasUser || !apiKey) return;

    setIsGenerating(true);
    setError(null);
    setGeneratedImages([]);
    setProgress({ current: 0, total: n });

    const body = {
      prompt,
      model,
      size,
      quality,
      outputFormat: format,
      outputCompression: compression,
      background,
      n,
      apiKey,
    };

    try {
      let finalUrls: string[] = [];

      if (stream) {
        const streamed = await tryStream<{ images: string[] }>(
          "/api/image/generate/stream",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          },
          (evt) => {
            if (evt.event === "image" && evt.data?.url) {
              setGeneratedImages((prev) => [...prev, evt.data.url]);
              setProgress((p) => (p ? { current: p.current + 1, total: p.total } : p));
            } else if (evt.event === "progress" && evt.data?.current != null && evt.data?.total != null) {
              setProgress({ current: evt.data.current, total: evt.data.total });
            }
          },
        );
        if (streamed) {
          finalUrls = streamed.data?.images ?? [];
        } else {
          // fallback to non-stream
          const response = await fetch("/api/image/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || "Failed to generate image");
          finalUrls = data.images ?? [];
          setGeneratedImages(finalUrls);
        }
      } else {
        const response = await fetch("/api/image/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to generate image");
        finalUrls = data.images ?? [];
        setGeneratedImages(finalUrls);
      }

      onImageGenerated?.(finalUrls);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate image");
    } finally {
      setIsGenerating(false);
      setProgress(null);
    }
  };

  const handleDownload = async (url: string, index: number) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = `generated-${index}.${format}`;
    a.click();
  };

  return (
    <div className="flex flex-1 flex-col gap-4 md:flex-row">
      <div className="w-full space-y-4 md:w-96">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Generate
            </CardTitle>
            <CardDescription>Generate images with OpenAI's latest models.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs value={category} onValueChange={(v) => setCategory(v as ImageCategory)}>
              <TabsList className="grid w-full grid-cols-5">
                {CATEGORIES.map((cat) => (
                  <TabsTrigger key={cat.id} value={cat.id} className="text-xs" title={cat.label}>
                    {cat.icon}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <div>
              <Label htmlFor="prompt">Prompt</Label>
              <Textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe what you want to generate..."
                rows={4}
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="model">Model</Label>
                <Select value={model} onValueChange={(v) => setModel(v as ImageModel)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {IMAGE_MODELS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="size">Size</Label>
                <Select value={size} onValueChange={(v) => setSize(v as GptImageSize)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {IMAGE_SIZES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="quality">Quality: {quality}</Label>
              <Select value={quality} onValueChange={(v) => setQuality(v as ImageQuality)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {IMAGE_QUALITIES.map((q) => (
                    <SelectItem key={q} value={q}>
                      {q}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="format">Format</Label>
                <Select value={format} onValueChange={(v) => setFormat(v as OutputFormat)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OUTPUT_FORMATS.map((f) => (
                      <SelectItem key={f} value={f}>
                        {f.toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="n">Count: {n}</Label>
                <Select value={String(n)} onValueChange={(v) => setN(Number(v))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4].map((num) => (
                      <SelectItem key={num} value={String(num)}>
                        {num}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="compression" className="text-sm">
                Compression: {compression}%
              </Label>
              <Slider
                id="compression"
                value={[compression]}
                onValueChange={([v]) => setCompression(v ?? 90)}
                max={100}
                min={0}
                step={10}
                className="w-32"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="transparent-bg" className="text-sm">
                Transparent Background
              </Label>
              <Switch
                id="transparent-bg"
                checked={background === "transparent"}
                onCheckedChange={(checked) => setBackground(checked ? "transparent" : "opaque")}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="stream-toggle" className="text-sm">
                  Stream partial images
                </Label>
                <p className="text-muted-foreground text-xs">
                  Show results as they finish (requires streaming endpoint).
                </p>
              </div>
              <Switch id="stream-toggle" checked={stream} onCheckedChange={setStream} />
            </div>

            <Button
              onClick={handleGenerate}
              disabled={!prompt.trim() || isGenerating || !hasUser || !apiKey}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating{progress ? ` ${progress.current}/${progress.total}` : "..."}
                </>
              ) : (
                "Generate Image"
              )}
            </Button>

            {error && (
              <p className="text-destructive flex items-center gap-2 text-sm">
                <AlertTriangle className="h-4 w-4" />
                {error}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex-1">
        <Card>
          <CardHeader>
            <CardTitle>Generated Images</CardTitle>
            <CardDescription>
              {generatedImages.length} image{generatedImages.length !== 1 ? "s" : ""} generated
            </CardDescription>
          </CardHeader>
          <CardContent>
            {generatedImages.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                {generatedImages.map((url, index) => (
                  <ResultTile
                    key={url}
                    url={url}
                    index={index}
                    format={format}
                    onDownload={() => handleDownload(url, index)}
                    showUseForEdit
                  />
                ))}
              </div>
            ) : (
              <div className="flex min-h-96 flex-col items-center justify-center rounded-lg border-2 border-dashed">
                {isGenerating ? (
                  <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
                ) : (
                  <>
                    <ImageIcon className="h-12 w-12 text-muted-foreground" />
                    <p className="mt-2 text-sm text-muted-foreground">
                      Enter a prompt and click Generate to create images
                    </p>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ---------------- Shared result tile ---------------- */

interface ResultTileProps {
  url: string;
  index: number;
  format: string;
  onDownload: () => void;
  showUseForEdit?: boolean;
}

function ResultTile({ url, index, format, onDownload, showUseForEdit }: ResultTileProps) {
  const handleUseForEdit = () => {
    sessionStorage.setItem("image-studio-edit-input", url);
    window.dispatchEvent(new Event("image-studio-use-for-edit"));
    const trigger = document.querySelector<HTMLButtonElement>('[data-tab-trigger="edit"]');
    trigger?.click();
  };

  return (
    <div className="group relative">
      <img
        src={url}
        alt={`Image ${index + 1}`}
        className="aspect-square w-full rounded-lg object-cover shadow-md"
      />
      <div className="absolute inset-0 flex items-center justify-center gap-2 rounded-lg bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
        <Button size="sm" variant="secondary" onClick={onDownload} title="Download">
          <Download className="h-4 w-4" />
        </Button>
        {showUseForEdit && (
          <Button
            size="sm"
            variant="secondary"
            onClick={handleUseForEdit}
            title="Use as input for Edit"
          >
            <Edit3 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

/* ---------------- Edit mode ---------------- */

interface EditModeProps {
  apiKey: string | null;
  hasUser: boolean;
}

function EditMode({ apiKey, hasUser }: EditModeProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const maskInputRef = useRef<HTMLInputElement | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [mask, setMask] = useState<File | null>(null);
  const [previews, setPreviews] = useState<string[]>([]);
  const [maskPreview, setMaskPreview] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState<ImageModel>("gpt-image-1");
  const [size, setSize] = useState<GptImageSize>("1024x1024");
  const [quality, setQuality] = useState<ImageQuality>("high");
  const [format, setFormat] = useState<OutputFormat>("png");
  const [compression, setCompression] = useState<number>(90);
  const [inputFidelity, setInputFidelity] = useState<InputFidelity>("high");
  const [moderation, setModeration] = useState<ModerationLevel>("auto");
  const [isEditing, setIsEditing] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Load URL-based input from Generate mode
  React.useEffect(() => {
    const onLoad = () => {
      const url = sessionStorage.getItem("image-studio-edit-input");
      if (url) {
        sessionStorage.removeItem("image-studio-edit-input");
        // Convert remote URL to File so it can be uploaded via FormData
        fetch(url)
          .then((r) => r.blob())
          .then((blob) => {
            const file = new File([blob], `input-${Date.now()}.png`, { type: blob.type || "image/png" });
            setFiles([file]);
            setPreviews([url]);
          })
          .catch(() => {});
      }
    };
    onLoad();
    window.addEventListener("image-studio-use-for-edit", onLoad);
    return () => window.removeEventListener("image-studio-use-for-edit", onLoad);
  }, []);

  const updatePreviews = (newFiles: File[]) => {
    Promise.all(newFiles.map(fileToDataUrl)).then(setPreviews);
  };

  const onFilesChange = (list: FileList | null) => {
    if (!list) return;
    const arr = Array.from(list).slice(0, 10);
    setFiles(arr);
    updatePreviews(arr);
  };

  const onMaskChange = (list: FileList | null) => {
    const file = list?.[0] ?? null;
    setMask(file);
    if (file) {
      fileToDataUrl(file).then(setMaskPreview);
    } else {
      setMaskPreview(null);
    }
  };

  const handleEdit = async () => {
    if (!prompt.trim() || files.length === 0 || !hasUser || !apiKey) return;

    setIsEditing(true);
    setError(null);
    setResults([]);

    try {
      const formData = new FormData();
      for (const file of files) formData.append("image", file);
      if (mask) formData.append("mask", mask);
      formData.append("prompt", prompt);
      formData.append("model", model);
      formData.append("size", size);
      formData.append("quality", quality);
      formData.append("outputFormat", format);
      formData.append("outputCompression", String(compression));
      formData.append("inputFidelity", inputFidelity);
      formData.append("moderation", moderation);
      formData.append("apiKey", apiKey);

      const response = await fetch("/api/image/edit", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to edit image");
      setResults(data.images ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to edit image");
    } finally {
      setIsEditing(false);
    }
  };

  const disabled = !prompt.trim() || files.length === 0 || isEditing || !hasUser || !apiKey;

  return (
    <div className="flex flex-1 flex-col gap-4 md:flex-row">
      <div className="w-full space-y-4 md:w-96">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Edit3 className="h-5 w-5" />
              Edit
            </CardTitle>
            <CardDescription>Upload an image (and optional mask) and describe the edit.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Input image(s) — up to 10</Label>
              <Input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => onFilesChange(e.target.files)}
                className="mt-1"
              />
              {previews.length > 0 && (
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {previews.map((src, i) => (
                    <img
                      key={i}
                      src={src}
                      alt={`Input ${i + 1}`}
                      className="h-16 w-16 rounded object-cover"
                    />
                  ))}
                </div>
              )}
            </div>

            <div>
              <Label>Mask (optional, for inpainting)</Label>
              <Input
                ref={maskInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => onMaskChange(e.target.files)}
                className="mt-1"
              />
              {maskPreview && (
                <img src={maskPreview} alt="Mask preview" className="mt-2 h-16 w-16 rounded object-cover" />
              )}
            </div>

            <div>
              <Label htmlFor="edit-prompt">Prompt</Label>
              <Textarea
                id="edit-prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the edit..."
                rows={3}
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-model">Model</Label>
                <Select value={model} onValueChange={(v) => setModel(v as ImageModel)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {IMAGE_MODELS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="edit-size">Size</Label>
                <Select value={size} onValueChange={(v) => setSize(v as GptImageSize)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {IMAGE_SIZES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="edit-quality">Quality: {quality}</Label>
              <Select value={quality} onValueChange={(v) => setQuality(v as ImageQuality)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {IMAGE_QUALITIES.map((q) => (
                    <SelectItem key={q} value={q}>
                      {q}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-input-fidelity">Input fidelity</Label>
                <Select
                  value={inputFidelity}
                  onValueChange={(v) => setInputFidelity(v as InputFidelity)}
                >
                  <SelectTrigger className="mt-1" title="How closely to follow the input image">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INPUT_FIDELITY_OPTIONS.map((f) => (
                      <SelectItem key={f} value={f}>
                        {f}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-muted-foreground mt-1 text-xs">
                  Higher fidelity preserves more of the source.
                </p>
              </div>

              <div>
                <Label htmlFor="edit-moderation">Moderation</Label>
                <Select
                  value={moderation}
                  onValueChange={(v) => setModeration(v as ModerationLevel)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MODERATION_OPTIONS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-muted-foreground mt-1 text-xs">Auto lets OpenAI decide.</p>
              </div>
            </div>

            <div>
              <Label htmlFor="edit-format">Format</Label>
              <Select value={format} onValueChange={(v) => setFormat(v as OutputFormat)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OUTPUT_FORMATS.map((f) => (
                    <SelectItem key={f} value={f}>
                      {f.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="edit-compression" className="text-sm">
                Compression: {compression}%
              </Label>
              <Slider
                id="edit-compression"
                value={[compression]}
                onValueChange={([v]) => setCompression(v ?? 90)}
                max={100}
                min={0}
                step={10}
                className="w-32"
              />
            </div>

            <Button onClick={handleEdit} disabled={disabled} className="w-full">
              {isEditing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Editing...
                </>
              ) : (
                "Apply Edit"
              )}
            </Button>

            {error && (
              <p className="text-destructive flex items-center gap-2 text-sm">
                <AlertTriangle className="h-4 w-4" />
                {error}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex-1">
        <Card>
          <CardHeader>
            <CardTitle>Edited Images</CardTitle>
            <CardDescription>
              {results.length} result{results.length !== 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {results.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                {results.map((url, i) => (
                  <ResultTile
                    key={url}
                    url={url}
                    index={i}
                    format={format}
                    onDownload={() => {
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `edited-${i}.${format}`;
                      a.click();
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="flex min-h-96 flex-col items-center justify-center rounded-lg border-2 border-dashed">
                {isEditing ? (
                  <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
                ) : (
                  <>
                    <Edit3 className="h-12 w-12 text-muted-foreground" />
                    <p className="mt-2 text-sm text-muted-foreground">
                      Upload an image and click Apply Edit
                    </p>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ---------------- Refine (Responses API) mode ---------------- */

interface RefineModeProps {
  apiKey: string | null;
  hasUser: boolean;
}

function RefineMode({ apiKey, hasUser }: RefineModeProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [instructions, setInstructions] = useState("");
  const [model, setModel] = useState<ResponsesModel>("gpt-4o");
  const [imageModel, setImageModel] = useState<ImageModel>("gpt-image-1");
  const [reasoningEffort, setReasoningEffort] = useState<ReasoningEffort>("medium");
  const [quality, setQuality] = useState<ImageQuality>("auto");
  const [moderation, setModeration] = useState<ModerationLevel>("auto");
  const [tools, setTools] = useState({
    web_search: false,
    code_interpreter: false,
    file_search: false,
  });
  const [previousResponseId, setPreviousResponseId] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamingText, setStreamingText] = useState("");
  const [streamingImages, setStreamingImages] = useState<string[]>([]);
  const conversationRef = useRef<HTMLDivElement | null>(null);

  const lastResponseId = [...messages].reverse().find((m) => m.responseId)?.responseId ?? "";

  const handleSend = async () => {
    if (!input.trim() || !hasUser || !apiKey) return;
    setIsSending(true);
    setError(null);
    setStreamingText("");
    setStreamingImages([]);

    const userMsg: ChatMessage = { role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    const currentInput = input;
    setInput("");

    const toolList = (Object.keys(tools) as Array<keyof typeof tools>).filter((t) => tools[t]);

    const body = {
      input: currentInput,
      instructions: instructions || undefined,
      model,
      imageModel,
      previousResponseId: previousResponseId || undefined,
      tools: toolList,
      reasoning: { effort: reasoningEffort },
      quality,
      moderation,
      apiKey,
    };

    try {
      let responseId = "";
      let assistantImages: string[] = [];
      let assistantText = "";

      const streamed = await tryStream<{ responseId: string; images: string[] }>(
        "/api/image/responses/stream",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
        (evt) => {
          if (evt.event === "text" && typeof evt.data?.delta === "string") {
            setStreamingText((prev) => prev + evt.data.delta);
            assistantText += evt.data.delta;
          } else if (evt.event === "image" && evt.data?.url) {
            setStreamingImages((prev) => [...prev, evt.data.url]);
            assistantImages.push(evt.data.url);
          } else if (evt.event === "response_id" && typeof evt.data?.id === "string") {
            responseId = evt.data.id;
          }
        },
      );

      if (!streamed) {
        const res = await fetch("/api/image/responses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to call Responses API");
        responseId = data.responseId ?? "";
        assistantImages = data.images ?? [];
      } else {
        responseId = streamed.data?.responseId ?? responseId;
        if (!assistantImages.length && streamed.data?.images) {
          assistantImages = streamed.data.images;
          setStreamingImages(assistantImages);
        }
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: assistantText, images: assistantImages, responseId },
      ]);
      if (responseId) setPreviousResponseId(responseId);
      setStreamingText("");
      setStreamingImages([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to call Responses API");
      // Roll back the optimistic user message on error
      setMessages((prev) => prev.slice(0, -1));
      setInput(currentInput);
    } finally {
      setIsSending(false);
    }

    setTimeout(() => {
      conversationRef.current?.scrollTo({ top: conversationRef.current.scrollHeight, behavior: "smooth" });
    }, 50);
  };

  const handleResetConversation = () => {
    setMessages([]);
    setPreviousResponseId("");
    setStreamingText("");
    setStreamingImages([]);
  };

  const disabled = !input.trim() || isSending || !hasUser || !apiKey;

  return (
    <div className="flex flex-1 flex-col gap-4 md:flex-row">
      <div className="w-full space-y-4 md:w-96">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5" />
              Refine (Responses API)
            </CardTitle>
            <CardDescription>
              Multi-turn refinement with tools, reasoning, and image generation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="rmodel">Reasoning model</Label>
              <Select value={model} onValueChange={(v) => setModel(v as ResponsesModel)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RESPONSES_MODELS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="rimage-model">Image model</Label>
              <Select value={imageModel} onValueChange={(v) => setImageModel(v as ImageModel)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {IMAGE_MODELS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="rinstructions">System instructions</Label>
              <Textarea
                id="rinstructions"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="You are a helpful image-generation assistant..."
                rows={3}
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-sm">Tools</Label>
              <div className="mt-2 space-y-2">
                {(
                  [
                    ["web_search", "Web search"],
                    ["code_interpreter", "Code interpreter"],
                    ["file_search", "File search"],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key} className="flex items-center gap-2">
                    <Checkbox
                      id={`tool-${key}`}
                      checked={tools[key]}
                      onCheckedChange={(c) => setTools((prev) => ({ ...prev, [key]: !!c }))}
                    />
                    <Label htmlFor={`tool-${key}`} className="text-sm font-normal">
                      {label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="rreasoning">Reasoning effort</Label>
                <Select
                  value={reasoningEffort}
                  onValueChange={(v) => setReasoningEffort(v as ReasoningEffort)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REASONING_EFFORTS.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-muted-foreground mt-1 text-xs">
                  How much the model reasons before answering.
                </p>
              </div>

              <div>
                <Label htmlFor="rquality">Quality</Label>
                <Select value={quality} onValueChange={(v) => setQuality(v as ImageQuality)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {IMAGE_QUALITIES.map((q) => (
                      <SelectItem key={q} value={q}>
                        {q}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="rmoderation">Moderation</Label>
              <Select
                value={moderation}
                onValueChange={(v) => setModeration(v as ModerationLevel)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODERATION_OPTIONS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="rprev">Previous response ID</Label>
              <Input
                id="rprev"
                value={previousResponseId}
                onChange={(e) => setPreviousResponseId(e.target.value)}
                placeholder="resp_... (auto-filled)"
                className="mt-1"
              />
              {lastResponseId && (
                <p className="text-muted-foreground mt-1 text-xs">Last: {lastResponseId}</p>
              )}
            </div>

            <Button onClick={handleSend} disabled={disabled} className="w-full">
              {isSending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send"
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={handleResetConversation}
              disabled={isSending || messages.length === 0}
              className="w-full"
            >
              Reset conversation
            </Button>

            {error && (
              <p className="text-destructive flex items-center gap-2 text-sm">
                <AlertTriangle className="h-4 w-4" />
                {error}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex-1">
        <Card>
          <CardHeader>
            <CardTitle>Conversation</CardTitle>
            <CardDescription>
              {messages.length} message{messages.length !== 1 ? "s" : ""}
              {previousResponseId ? ` · linked to ${previousResponseId.slice(0, 14)}…` : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              ref={conversationRef}
              className="max-h-[28rem] space-y-3 overflow-y-auto rounded-lg border p-3"
            >
              {messages.length === 0 && !isSending && (
                <div className="text-muted-foreground flex flex-col items-center justify-center py-12 text-sm">
                  <Wand2 className="mb-2 h-8 w-8" />
                  Send a message to start a multi-turn refinement session.
                </div>
              )}

              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`rounded-lg p-3 text-sm ${
                    msg.role === "user"
                      ? "bg-primary/10 ml-8"
                      : "bg-muted mr-8"
                  }`}
                >
                  <div className="text-muted-foreground mb-1 text-xs font-semibold uppercase">
                    {msg.role}
                    {msg.responseId ? ` · ${msg.responseId.slice(0, 14)}…` : ""}
                  </div>
                  {msg.content && <div className="whitespace-pre-wrap">{msg.content}</div>}
                  {msg.images && msg.images.length > 0 && (
                    <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-3">
                      {msg.images.map((url, idx) => (
                        <ResultTile
                          key={url}
                          url={url}
                          index={idx}
                          format="png"
                          onDownload={() => {
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = `refined-${idx}.png`;
                            a.click();
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {isSending && (
                <div className="bg-muted mr-8 rounded-lg p-3 text-sm">
                  <div className="text-muted-foreground mb-1 text-xs font-semibold uppercase">
                    assistant
                  </div>
                  {streamingText && <div className="whitespace-pre-wrap">{streamingText}</div>}
                  {streamingImages.length > 0 && (
                    <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-3">
                      {streamingImages.map((url, idx) => (
                        <img
                          key={`${idx}-${url}`}
                          src={url}
                          alt={`Streaming ${idx + 1}`}
                          className="aspect-square w-full rounded-lg object-cover shadow-md"
                        />
                      ))}
                    </div>
                  )}
                  {!streamingText && streamingImages.length === 0 && (
                    <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
                  )}
                </div>
              )}
            </div>

            <div className="mt-3">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Describe the next refinement..."
                rows={3}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}