"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Loader2, ImageIcon, Download, RefreshCw } from "lucide-react";
import { useAuth } from "@/components/supabase-provider";
import type {
  ImageModel,
  ImageSize,
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
const IMAGE_SIZES: ImageSize[] = ["1024x1024", "1536x1024", "1024x1536", "auto"];

// Qualities
const IMAGE_QUALITIES: ImageQuality[] = ["low", "medium", "high", "auto"];

// Formats
const OUTPUT_FORMATS: OutputFormat[] = ["png", "jpeg", "webp"];

interface ImageStudioProps {
  initialCategory?: ImageCategory;
  onImageGenerated?: (images: any[]) => void;
}

/**
 * AI Image Studio - Full-featured image generation interface with 15 categorized workflows
 */
export function ImageStudio({ initialCategory = "core", onImageGenerated }: ImageStudioProps) {
  const { user } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [category, setCategory] = useState<ImageCategory>(initialCategory);
  const [model, setModel] = useState<ImageModel>("gpt-image-1");
  const [size, setSize] = useState<ImageSize>("1024x1024");
  const [quality, setQuality] = useState<ImageQuality>("high");
  const [format, setFormat] = useState<OutputFormat>("png");
  const [compression, setCompression] = useState(90);
  const [background, setBackground] = useState<ImageBackground>("opaque");
  const [n, setN] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

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
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate image");
      }

      setGeneratedImages(data.images?.map((img: any) => img.url) ?? []);
      onImageGenerated?.(data.images);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate image");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async (url: string, index: number) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = `generated-${index}.${format}`;
    a.click();
  };

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
              Generate images with OpenAI's latest models. Choose from 15 categories below.
            </CardDescription>
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
                <Select value={size} onValueChange={(v) => setSize(v as ImageSize)}>
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
                onValueChange={([v]) => setCompression(v)}
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
                  <div key={url} className="group relative">
                    <img
                      src={url}
                      alt={`Generated ${index + 1}`}
                      className="aspect-square w-full rounded-lg object-cover shadow-md"
                    />
                    <div className="absolute inset-0 flex items-center justify-center gap-2 rounded-lg bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleDownload(url, index)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setPrompt(prompt)}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
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