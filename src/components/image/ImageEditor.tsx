"use client";

import * as React from "react";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Loader2, Upload, Scissors, Download, RefreshCw } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getApiKey } from "@/lib/key-storage";
import { useAuth } from "@/components/supabase-provider";
import {
  type ImageModel,
  type GptImageSize,
  type ImageQuality,
  type OutputFormat,
  type ImageBackground,
} from "@/lib/image/types";

// Image models
const IMAGE_MODELS: ImageModel[] = ["gpt-image-1", "gpt-image-1-mini", "gpt-image-1.5", "gpt-image-2", "dall-e-2"];

// Sizes
const IMAGE_SIZES: GptImageSize[] = ["1024x1024", "1536x1024", "1024x1536", "auto"];

// Qualities
const IMAGE_QUALITIES: ImageQuality[] = ["low", "medium", "high", "auto"];

// Formats
const OUTPUT_FORMATS: OutputFormat[] = ["png", "jpeg", "webp"];

interface ImageEditorProps {
  onImageEdited?: (images: any[]) => void;
  onImageSelect?: (url: string) => void;
}

/**
 * AI Image Editor - Background replacement, object removal, inpainting
 */
export function ImageEditor({ onImageEdited, onImageSelect }: ImageEditorProps) {
  const { user } = useAuth();
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [mask, setMask] = useState<File | null>(null);
  const [maskPreview, setMaskPreview] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState<ImageModel>("gpt-image-1");
  const [size, setSize] = useState<GptImageSize>("1024x1024");
  const [quality, setQuality] = useState<ImageQuality>("high");
  const [format, setFormat] = useState<OutputFormat>("png");
  const [compression, setCompression] = useState<number>(90);
  const [background, setBackground] = useState<ImageBackground>("opaque");
  const [n, setN] = useState(1);
  const [isEditingImage, setIsEditingImage] = useState(false);
  const [isCreatingVariation, setIsCreatingVariation] = useState(false);
  const [editedImages, setEditedImages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [failedAction, setFailedAction] = useState<"edit" | "variation" | null>(null);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const maskInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      if (maskPreview) URL.revokeObjectURL(maskPreview);
    };
  }, [imagePreview, maskPreview]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleMaskSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (maskPreview) URL.revokeObjectURL(maskPreview);
      setMask(file);
      setMaskPreview(URL.createObjectURL(file));
    }
  };

  const handleEdit = async () => {
    if (!image || !prompt || !user) return;

    setIsEditingImage(true);
    setError(null);
    setFailedAction(null);

    try {
      const formData = new FormData();
      formData.append("image", image);
      formData.append("prompt", prompt);
      if (mask) formData.append("mask", mask);
      formData.append("model", model);
      formData.append("size", size);
      formData.append("quality", quality);
      formData.append("outputFormat", format);
      formData.append("outputCompression", String(compression));
      formData.append("background", background);
      formData.append("n", String(n));
      formData.append("apiKey", getApiKey() ?? "");

      const response = await fetch("/api/image/edit", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to edit image");
      }

      setEditedImages(data.images?.map((img: any) => img.url) ?? []);
      onImageEdited?.(data.images);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to edit image");
      setFailedAction("edit");
    } finally {
      setIsEditingImage(false);
    }
  };

  const handleVariation = async () => {
    if (!image || !user) return;

    setIsCreatingVariation(true);
    setError(null);
    setFailedAction(null);

    try {
      const formData = new FormData();
      formData.append("image", image);
      formData.append("model", model);
      formData.append("size", size);
      formData.append("apiKey", getApiKey() ?? "");

      const response = await fetch("/api/image/variations", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create variation");
      }

      setEditedImages(data.images?.map((img: any) => img.url) ?? []);
      onImageEdited?.(data.images);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create variation");
      setFailedAction("variation");
    } finally {
      setIsCreatingVariation(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:flex-row">
      <div className="w-full space-y-4 md:w-96">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scissors className="h-5 w-5" />
              AI Image Editor
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Image Upload */}
            <div>
              <Label>Upload Image</Label>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                className="mt-1 w-full"
                onClick={() => imageInputRef.current?.click()}
              >
                <Upload className="mr-2 h-4 w-4" />
                {image ? image.name : "Select Image"}
              </Button>
              {imagePreview && (
                <div className="mt-2 rounded-lg border bg-muted/50 p-2">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="aspect-video w-full rounded object-cover"
                  />
                </div>
              )}
            </div>

            {/* Mask Upload (Optional) */}
            <div>
              <Label>Upload Mask (Optional - for inpainting)</Label>
              <p className="text-xs text-muted-foreground">
                White areas indicate where to edit. Transparent areas remain unchanged.
              </p>
              <input
                ref={maskInputRef}
                type="file"
                accept="image/*"
                onChange={handleMaskSelect}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                className="mt-1 w-full"
                onClick={() => maskInputRef.current?.click()}
                disabled={!image}
              >
                <Upload className="mr-2 h-4 w-4" />
                {mask ? mask.name : "Select Mask"}
              </Button>
              {maskPreview && (
                <div className="mt-2 rounded-lg border bg-muted/50 p-2">
                  <img
                    src={maskPreview}
                    alt="Mask preview"
                    className="aspect-video w-full rounded object-cover"
                  />
                </div>
              )}
            </div>

            {/* Edit Prompt */}
            <div>
              <Label htmlFor="edit-prompt">Edit Prompt</Label>
              <Textarea
                id="edit-prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder='Describe the edit: "Replace background with beach", "Remove the car", etc.'
                rows={3}
                className="mt-1"
              />
            </div>

            {/* Model Selection */}
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

            {/* Size, Quality, Format, Count */}
            <div className="grid grid-cols-2 gap-4">
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

              <div>
                <Label htmlFor="edit-quality">Quality</Label>
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

            <div className="grid grid-cols-2 gap-4">
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

              <div>
                <Label htmlFor="edit-n">Count: {n}</Label>
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

            {/* Compression Slider */}
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

            {/* Background Toggle */}
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-transparent-bg" className="text-sm">
                Transparent Background
              </Label>
              <Switch
                id="edit-transparent-bg"
                checked={background === "transparent"}
                onCheckedChange={(checked) => setBackground(checked ? "transparent" : "opaque")}
              />
            </div>

            {/* Edit Actions */}
            <div className="flex gap-2">
              <Button
                onClick={handleEdit}
                disabled={!image || !prompt || isEditingImage || !user}
                className="flex-1"
              >
                {isEditingImage ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Editing...
                  </>
                ) : (
                  "Edit Image"
                )}
              </Button>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={handleVariation}
                      disabled={!image || isCreatingVariation || !user}
                      className="flex-1"
                    >
                      {isCreatingVariation ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        "Create Variations"
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Generate new variations of the uploaded image using AI
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-2">
                <p className="flex-1 text-sm text-destructive">{error}</p>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                  onClick={() => {
                    setError(null);
                    setFailedAction(null);
                    if (failedAction === "edit") handleEdit();
                    else if (failedAction === "variation") handleVariation();
                  }}
                  title="Retry"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex-1">
        <Card>
          <CardHeader>
            <CardTitle>Edited Images</CardTitle>
          </CardHeader>
          <CardContent>
            {editedImages.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                {editedImages.map((url, index) => (
                  <div key={url} className="group relative">
                    <img
                      src={url}
                      alt={`Edited ${index + 1}`}
                      className="aspect-square w-full rounded-lg object-cover shadow-md"
                    />
                    <div className="absolute inset-0 flex items-end justify-center gap-2 rounded-lg bg-gradient-to-t from-black/60 to-transparent p-2 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-8 w-8 p-0"
                        onClick={() => {
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `edited-${index}.${format}`;
                          a.click();
                        }}
                        title="Download"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      {onImageSelect && (
                        <Button
                          size="sm"
                          className="h-8 px-2 text-xs"
                          onClick={() => onImageSelect(url)}
                        >
                          Use
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex min-h-96 flex-col items-center justify-center rounded-lg border-2 border-dashed">
                {isEditingImage || isCreatingVariation ? (
                  <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
                ) : (
                  <>
                    <Scissors className="h-12 w-12 text-muted-foreground" />
                    <p className="mt-2 text-sm text-muted-foreground">
                      Upload an image and enter an edit prompt
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
