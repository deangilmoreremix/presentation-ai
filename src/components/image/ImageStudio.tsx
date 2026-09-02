"use client";

import * as React from "react";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  ImageIcon,
  Download,
  RefreshCw,
  Wand2,
  LayoutTemplate,
  Search,
  ImagePlus,
  Sparkles,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { getApiKey } from "@/lib/key-storage";
import { useAuth } from "@/components/AppAuthProvider";
import { searchUnsplashImages } from "@/app/_actions/apps/image-studio/unsplash";
import { searchGoogleImages } from "@/app/_actions/apps/image-studio/google";
import { generateInfographicImageAction } from "@/app/_actions/apps/image-studio/generate-infographic";
import { fetchGeneratedImages } from "@/app/_actions/apps/image-studio/fetch";
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
const IMAGE_MODELS: ImageModel[] = ["gpt-image-2", "gpt-image-1", "gpt-image-1-mini", "gpt-image-1.5", "dall-e-3", "dall-e-2"];

// Sizes
const IMAGE_SIZES: GptImageSize[] = ["1024x1024", "1536x1024", "1024x1536", "auto"];

// Qualities
const IMAGE_QUALITIES: ImageQuality[] = ["low", "medium", "high", "auto"];

// Formats
const OUTPUT_FORMATS: OutputFormat[] = ["png", "jpeg", "webp"];

// Category -> prompt presets and default params
const CATEGORY_PRESETS: Record<
  ImageCategory,
  { prefix: string; suffix: string; model: ImageModel; size: GptImageSize; quality: ImageQuality; format: OutputFormat; n: number }
> = {
  core: {
    prefix: "A stunning, highly detailed digital artwork depicting",
    suffix: ", cinematic lighting, vibrant colors, award-winning quality",
    model: "gpt-image-2",
    size: "1024x1024",
    quality: "high",
    format: "png",
    n: 1,
  },
  marketing: {
    prefix: "Professional marketing ad visual for a modern brand showing",
    suffix: ", bold typography space at top, eye-catching, commercial photography style",
    model: "gpt-image-1",
    size: "1536x1024",
    quality: "high",
    format: "png",
    n: 1,
  },
  branding: {
    prefix: "Elegant brand identity logo concept featuring",
    suffix: ", minimal design, vector-quality, white background, professional",
    model: "gpt-image-1",
    size: "1024x1024",
    quality: "high",
    format: "png",
    n: 1,
  },
  product: {
    prefix: "Clean product photography of",
    suffix: ", studio lighting, white background, ecommerce style, sharp focus",
    model: "gpt-image-1",
    size: "1024x1024",
    quality: "high",
    format: "png",
    n: 1,
  },
  content: {
    prefix: "Eye-catching social media content graphic of",
    suffix: ", modern aesthetic, engaging composition, high contrast",
    model: "gpt-image-1",
    size: "1024x1024",
    quality: "high",
    format: "png",
    n: 1,
  },
  editing: {
    prefix: "Expert photo edit of",
    suffix: ", seamless retouching, natural lighting, professional post-processing",
    model: "gpt-image-1",
    size: "1024x1024",
    quality: "high",
    format: "png",
    n: 1,
  },
  composition: {
    prefix: "Artfully composed scene with",
    suffix: ", balanced layout, depth of field, harmonious color palette",
    model: "gpt-image-2",
    size: "1024x1024",
    quality: "high",
    format: "png",
    n: 1,
  },
  consistency: {
    prefix: "Consistent style image of",
    suffix: ", same visual language, coherent design system, reproducible look",
    model: "gpt-image-1",
    size: "1024x1024",
    quality: "high",
    format: "png",
    n: 2,
  },
  "ui-ux": {
    prefix: "Modern UI/UX interface mockup featuring",
    suffix: ", clean design system, accessible colors, Figma-quality render",
    model: "gpt-image-2",
    size: "1536x1024",
    quality: "high",
    format: "png",
    n: 1,
  },
  educational: {
    prefix: "Clear educational infographic explaining",
    suffix: ", labeled diagram, instructional layout, accessible design",
    model: "gpt-image-1",
    size: "1024x1024",
    quality: "high",
    format: "png",
    n: 1,
  },
  storytelling: {
    prefix: "Dramatic storybook illustration of",
    suffix: ", evocative atmosphere, narrative composition, painterly style",
    model: "gpt-image-2",
    size: "1024x1024",
    quality: "high",
    format: "png",
    n: 1,
  },
  "real-estate": {
    prefix: "Luxury real estate photograph of",
    suffix: ", professional architectural photography, golden hour lighting, wide angle",
    model: "gpt-image-1",
    size: "1536x1024",
    quality: "high",
    format: "jpeg",
    n: 1,
  },
  fashion: {
    prefix: "High-fashion editorial photograph of",
    suffix: ", dramatic studio lighting, editorial composition, Vogue-quality",
    model: "gpt-image-1",
    size: "1024x1536",
    quality: "high",
    format: "png",
    n: 1,
  },
  automation: {
    prefix: "Automated workflow diagram showing",
    suffix: ", clean flowchart style, technical illustration, SaaS aesthetic",
    model: "gpt-image-1",
    size: "1536x1024",
    quality: "medium",
    format: "png",
    n: 1,
  },
  "saas-products": {
    prefix: "SaaS product dashboard UI showing",
    suffix: ", clean modern interface, data visualization, startup-quality design",
    model: "gpt-image-2",
    size: "1536x1024",
    quality: "high",
    format: "png",
    n: 1,
  },
};

interface SessionImage {
  url: string;
  prompt: string;
  originalPrompt: string;
  category: ImageCategory;
  model: ImageModel;
  responseId?: string;
  timestamp: number;
}

interface DbImage {
  url: string;
  prompt: string;
  model: string | null;
  created_at: string;
}

interface StockImage {
  url: string;
  thumb?: string;
  author?: string;
  title?: string;
  source?: string;
}

type StudioTab = "generate" | "stock" | "infographic";

interface ImageStudioProps {
  initialCategory?: ImageCategory;
  onImageGenerated?: (images: any[]) => void;
}

export function ImageStudio({ initialCategory = "core", onImageGenerated }: ImageStudioProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [prompt, setPrompt] = useState("");
  const [category, setCategory] = useState<ImageCategory>(initialCategory);
  const [model, setModel] = useState<ImageModel>("gpt-image-2");
  const [size, setSize] = useState<GptImageSize>("1024x1024");
  const [quality, setQuality] = useState<ImageQuality>("high");
  const [format, setFormat] = useState<OutputFormat>("png");
  const [compression, setCompression] = useState<number>(90);
  const [background, setBackground] = useState<ImageBackground>("opaque");
  const [n, setN] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [studioTab, setStudioTab] = useState<StudioTab>("generate");
  const [dbHistory, setDbHistory] = useState<DbImage[]>([]);
  const [isLoadingPastImages, setIsLoadingPastImages] = useState(false);

  const [stockSearchQuery, setStockSearchQuery] = useState("");
  const [stockResults, setStockResults] = useState<StockImage[]>([]);
  const [stockLoading, setStockLoading] = useState(false);
  const [stockSource, setStockSource] = useState<"unsplash" | "google">("unsplash");

  const [infographicPrompt, setInfographicPrompt] = useState("");
  const [infographicLayout, setInfographicLayout] = useState("Timeline");
  const [infographicModel, setInfographicModel] = useState<string>("gpt-image-2");
  const [infographicGenerating, setInfographicGenerating] = useState(false);
  const [infographicResult, setInfographicResult] = useState<string | null>(null);
  const [infographicError, setInfographicError] = useState<string | null>(null);

  // Session history accumulates across generations
  const [history, setHistory] = useState<SessionImage[]>([]);
  // Refinement state per image (keyed by index in history)
  const [refiningId, setRefiningId] = useState<string | null>(null);
  const [refinePrompt, setRefinePrompt] = useState<Record<string, string>>({});

  const applyCategoryPreset = (cat: ImageCategory) => {
    const preset = CATEGORY_PRESETS[cat];
    setPrompt(preset.prefix + " " + preset.suffix);
    setModel(preset.model);
    setSize(preset.size);
    setQuality(preset.quality);
    setFormat(preset.format);
    setN(preset.n);
  };

  const handleCategoryChange = (cat: ImageCategory) => {
    setCategory(cat);
    applyCategoryPreset(cat);
  };

  const addToHistory = (urls: string[], prompt: string, responseId?: string) => {
    const entries: SessionImage[] = urls.map((url) => ({
      url,
      prompt,
      originalPrompt: prompt,
      category,
      model,
      responseId,
      timestamp: Date.now(),
    }));
    setHistory((prev) => [...entries, ...prev]);
  };

  const loadPastImages = async () => {
    if (!user) return;
    setIsLoadingPastImages(true);
    try {
      const images = await fetchGeneratedImages();
      setDbHistory(
        images.map((img) => ({
          url: img.url,
          prompt: img.prompt,
          model: img.model,
          created_at: img.created_at,
        })),
      );
    } catch {
      // silent
    } finally {
      setIsLoadingPastImages(false);
    }
  };

  const handleStockSearch = async () => {
    if (!stockSearchQuery.trim()) return;
    setStockLoading(true);
    setStockResults([]);
    try {
      if (stockSource === "unsplash") {
        const res = await searchUnsplashImages(stockSearchQuery);
        if (res.success && res.images) {
          setStockResults(
            res.images.map((img) => ({
              url: img.url,
              thumb: img.thumb,
              author: img.author,
              title: img.author,
              source: `Unsplash / ${img.author}`,
            })),
          );
        }
      } else {
        const res = await searchGoogleImages(stockSearchQuery);
        if (res.success && res.images) {
          setStockResults(res.images);
        }
      }
    } catch {
      // silent
    } finally {
      setStockLoading(false);
    }
  };

  const handleInfographicGenerate = async () => {
    const trimmed = infographicPrompt.trim();
    if (!trimmed || !user) return;
    setInfographicGenerating(true);
    setInfographicError(null);
    setInfographicResult(null);
    try {
      const result = await generateInfographicImageAction({
        prompt: trimmed,
        layout: infographicLayout,
        model: infographicModel as any,
        apiKey: getApiKey() ?? undefined,
      });
      if (!result.success || !result.image) {
        throw new Error(result.error ?? "Failed to generate infographic");
      }
      setInfographicResult(result.image.url);
      addToHistory([result.image.url], trimmed, result.image.id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to generate infographic";
      setInfographicError(msg);
    } finally {
      setInfographicGenerating(false);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || !user) return;

    setIsGenerating(true);
    setError(null);
    setGeneratedImages([]);

    try {
      const response = await fetch("/api/image/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          model,
          size,
          quality,
          outputFormat: format,
          outputCompression: compression,
          background,
          n,
          apiKey: getApiKey() ?? undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate image");
      }

      const urls = data.images?.map((img: any) => img.url) ?? [];
      setGeneratedImages(urls);
      addToHistory(urls, prompt);
      onImageGenerated?.(data.images);
      toast({
        title: "Success",
        description: "Image generated successfully",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to generate image";
      setError(message);
      toast({
        variant: "destructive",
        title: "Error",
        description: message,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRefine = async (entry: SessionImage) => {
    const refinement = refinePrompt[entry.url]?.trim();
    if (!refinement || !user) return;

    setRefiningId(entry.url);
    setError(null);

    try {
      const combinedPrompt = `${entry.prompt}. Refine: ${refinement}`;
      const response = await fetch("/api/image/responses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: combinedPrompt,
          model: "gpt-image-1",
          imageModel: entry.model,
          size,
          quality,
          outputFormat: format,
          outputCompression: compression,
          background,
          action: "edit",
          previousResponseId: entry.responseId,
          n: 1,
          apiKey: getApiKey() ?? undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to refine image");
      }

      const urls = data.images ?? [];
      setGeneratedImages(urls);
      addToHistory(urls, combinedPrompt, data.responseId);
      toast({
        title: "Refined",
        description: "Image refined successfully",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to refine image";
      setError(message);
      toast({
        variant: "destructive",
        title: "Error",
        description: message,
      });
    } finally {
      setRefiningId(null);
      setRefinePrompt((prev) => {
        const next = { ...prev };
        delete next[entry.url];
        return next;
      });
    }
  };

  const handleDownload = async (url: string, index: number) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = `generated-${index}.${format}`;
    a.click();
  };

  React.useEffect(() => {
    if (user) {
      loadPastImages();
    }
  }, [user]);

  const handleRegenerate = async (originalPrompt: string) => {
    if (!originalPrompt.trim() || !user) return;
    setIsGenerating(true);
    setPrompt(originalPrompt);
    setError(null);
    setGeneratedImages([]);

    try {
      const response = await fetch("/api/image/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: originalPrompt,
          model,
          size,
          quality,
          outputFormat: format,
          outputCompression: compression,
          background,
          n,
          apiKey: getApiKey() ?? undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate image");
      }

      const urls = data.images?.map((img: any) => img.url) ?? [];
      setGeneratedImages(urls);
      addToHistory(urls, originalPrompt);
      onImageGenerated?.(data.images);
      toast({
        title: "Success",
        description: "Image regenerated successfully",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to regenerate image";
      setError(message);
      toast({
        variant: "destructive",
        title: "Error",
        description: message,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const renderImageCard = (url: string, index: number, isLatestBatch: boolean, entry?: SessionImage) => (
    <div key={`${url}-${index}`} className="group relative">
      <img
        src={url}
        alt={`Generated ${index + 1}`}
        className="aspect-square w-full rounded-lg object-cover shadow-md"
      />
      <div className="absolute inset-0 flex items-end justify-center gap-2 rounded-lg bg-gradient-to-t from-black/60 to-transparent p-2 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => handleDownload(url, index)}
          className="h-8 w-8 p-0"
          title="Download"
        >
          <Download className="h-4 w-4" />
        </Button>
        {isLatestBatch && entry && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleRegenerate(entry.originalPrompt)}
            className="h-8 w-8 p-0"
            title="Regenerate"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:flex-row">
      <div className="w-full space-y-4 md:w-96">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              AI Image Studio
            </CardTitle>
            <CardDescription>
              Generate images with OpenAI&apos;s latest models. Choose from 15 categories below.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs value={category} onValueChange={(v) => handleCategoryChange(v as ImageCategory)}>
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

            <Button
              onClick={handleGenerate}
              disabled={!prompt.trim() || isGenerating || !user}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                "Generate Image"
              )}
            </Button>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </CardContent>
        </Card>
      </div>

      <div className="flex-1 space-y-4">
        <Tabs value={studioTab} onValueChange={(v) => setStudioTab(v as "generate" | "stock" | "infographic")}>
          <TabsList>
            <TabsTrigger
              value="generate"
              onClick={() => setStudioTab("generate")}
              data-state={studioTab === "generate" ? "active" : "inactive"}
              className="gap-1"
            >
              <ImageIcon className="h-4 w-4" />
              Generate
            </TabsTrigger>
            <TabsTrigger
              value="stock"
              onClick={() => setStudioTab("stock")}
              data-state={studioTab === "stock" ? "active" : "inactive"}
              className="gap-1"
            >
              <Search className="h-4 w-4" />
              Stock Images
            </TabsTrigger>
            <TabsTrigger
              value="infographic"
              onClick={() => setStudioTab("infographic")}
              data-state={studioTab === "infographic" ? "active" : "inactive"}
              className="gap-1"
            >
              <LayoutTemplate className="h-4 w-4" />
              Infographic
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {studioTab === "generate" && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Generated Images</CardTitle>
                <CardDescription>
                  {generatedImages.length > 0
                    ? `${generatedImages.length} image${generatedImages.length !== 1 ? "s" : ""} in latest batch`
                    : "Enter a prompt and click Generate to create images"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {generatedImages.length > 0 ? (
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                    {generatedImages.map((url, index) =>
                      renderImageCard(url, index, true, history[index])
                    )}
                  </div>
                ) : (
                  <div className="flex min-h-96 flex-col items-center justify-center rounded-lg border-2 border-dashed">
                    {isGenerating ? (
                      <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
                    ) : (
                      <>
                        <ImagePlus className="h-12 w-12 text-muted-foreground" />
                        <p className="mt-2 text-sm text-muted-foreground">
                          Your generated images will appear here. Start by entering a prompt above.
                        </p>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {(history.length > 0 || dbHistory.length > 0) && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>History</CardTitle>
                      <CardDescription>
                        {history.length} image{history.length !== 1 ? "s" : ""} this session
                        {dbHistory.length > 0 && ` · ${dbHistory.length} from past sessions`}
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={loadPastImages}
                      disabled={isLoadingPastImages}
                    >
                      {isLoadingPastImages ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="mr-2 h-4 w-4" />
                      )}
                      Load past images
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    {dbHistory.map((entry, idx) => (
                      <div key={`db-${entry.url}-${idx}`} className="group space-y-1">
                        <div className="relative">
                          <img
                            src={entry.url}
                            alt={`Past ${idx + 1}`}
                            className="aspect-square w-full rounded-lg object-cover shadow-md"
                          />
                          <div className="absolute inset-0 flex items-end justify-center rounded-lg bg-gradient-to-t from-black/50 to-transparent p-2 opacity-0 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                            <Button
                              size="sm"
                              variant="secondary"
                              className="h-8 w-8 p-0"
                              onClick={() => handleDownload(entry.url, idx)}
                              title="Download"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <p className="truncate text-xs text-muted-foreground">{entry.prompt}</p>
                        <p className="text-xs text-muted-foreground/60">
                          {new Date(entry.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                    {history.map((entry, idx) => {
                      const isRefining = refiningId === entry.url;
                      return (
                        <div key={`${entry.url}-${idx}`} className="group space-y-2">
                          <div className="relative">
                            <img
                              src={entry.url}
                              alt={`History ${idx + 1}`}
                              className="aspect-square w-full rounded-lg object-cover shadow-md"
                            />
                            <div className="absolute inset-0 flex items-end justify-center gap-1 rounded-lg bg-gradient-to-t from-black/60 to-transparent p-2 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                              <Button
                                size="sm"
                                variant="secondary"
                                className="h-8 w-8 p-0"
                                onClick={() => handleDownload(entry.url, idx)}
                                title="Download"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <p className="truncate text-xs text-muted-foreground">{entry.prompt}</p>
                          <div className="flex items-center gap-1">
                            <Input
                              placeholder="Refine..."
                              value={refinePrompt[entry.url] ?? ""}
                              onChange={(e) =>
                                setRefinePrompt((prev) => ({ ...prev, [entry.url]: e.target.value }))
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleRefine(entry);
                              }}
                              className="h-7 text-xs"
                              disabled={isRefining}
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2"
                              onClick={() => handleRefine(entry)}
                              disabled={isRefining || !(refinePrompt[entry.url]?.trim())}
                              title="Refine image"
                            >
                              {isRefining ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Wand2 className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {studioTab === "stock" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Stock Images
              </CardTitle>
              <CardDescription>
                Search for free stock images to use in your projects
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Select
                  value={stockSource}
                  onValueChange={(v) => setStockSource(v as "unsplash" | "google")}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unsplash">Stock Photos</SelectItem>
                    <SelectItem value="google">Web Search</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Search stock images..."
                  value={stockSearchQuery}
                  onChange={(e) => setStockSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleStockSearch()}
                  className="flex-1"
                />
                <Button onClick={handleStockSearch} disabled={stockLoading || !stockSearchQuery.trim()}>
                  {stockLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>

              {stockResults.length > 0 ? (
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                  {stockResults.map((img, idx) => (
                    <div key={idx} className="group relative">
                      <img
                        src={img.thumb || img.url}
                        alt={img.title || `Stock ${idx + 1}`}
                        className="aspect-square w-full rounded-lg object-cover shadow-md"
                      />
                      <div className="absolute inset-0 flex items-end justify-center gap-1 rounded-lg bg-gradient-to-t from-black/60 to-transparent p-2 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-8 w-8 p-0"
                          onClick={() => handleDownload(img.url, idx)}
                          title="Download"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-8 w-8 p-0 text-xs"
                          onClick={() => {
                            setPrompt(img.title || img.url);
                            setStudioTab("generate");
                          }}
                          title="Use as prompt"
                        >
                          <ImagePlus className="h-4 w-4" />
                        </Button>
                      </div>
                      {img.author && (
                        <p className="mt-1 truncate text-xs text-muted-foreground">{img.author}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : !stockLoading && (
                <div className="flex min-h-64 flex-col items-center justify-center rounded-lg border-2 border-dashed">
                  <Search className="h-10 w-10 text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">
                     Search stock images
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {studioTab === "infographic" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LayoutTemplate className="h-5 w-5" />
                AI Infographic Generator
              </CardTitle>
              <CardDescription>
                Create presentation-ready infographic images
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {infographicResult && (
                <div className="relative overflow-hidden rounded-lg border">
                  <img
                    src={infographicResult}
                    alt="Generated infographic"
                    className="aspect-video w-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-end justify-center gap-2 bg-gradient-to-t from-black/60 to-transparent p-3 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleDownload(infographicResult, 0)}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </Button>
                  </div>
                </div>
              )}

              {!infographicResult && (
                <div className="flex min-h-40 flex-col items-center justify-center rounded-lg border-2 border-dashed">
                  <LayoutTemplate className="h-10 w-10 text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    Enter a topic to generate an infographic
                  </p>
                </div>
              )}

              <div>
                <Label htmlFor="infographic-prompt">Topic / Prompt</Label>
                <Textarea
                  id="infographic-prompt"
                  value={infographicPrompt}
                  onChange={(e) => setInfographicPrompt(e.target.value)}
                  placeholder="Describe the topic for your infographic (e.g., The 5 stages of business growth)"
                  rows={3}
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Layout</Label>
                  <Select value={infographicLayout} onValueChange={setInfographicLayout}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["Timeline", "Process", "Comparison", "Hierarchy", "Cycle", "Roadmap", "Matrix"].map(
                        (layout) => (
                          <SelectItem key={layout} value={layout}>
                            {layout}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Model</Label>
                  <Select value={infographicModel} onValueChange={setInfographicModel}>
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
              </div>

              <Button
                onClick={handleInfographicGenerate}
                disabled={!infographicPrompt.trim() || infographicGenerating || !user}
                className="w-full"
              >
                {infographicGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Infographic...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Infographic
                  </>
                )}
              </Button>

              {infographicError && <p className="text-sm text-destructive">{infographicError}</p>}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
