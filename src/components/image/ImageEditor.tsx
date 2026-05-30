"use client";

import * as React from "react";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Upload, Scissors, RefreshCw } from "lucide-react";
import { useAuth } from "@/components/supabase-provider";
import type {
  ImageModel,
  GptImageSize,
  ImageQuality,
  OutputFormat,
} from "@/lib/image/types";

// Image models
const IMAGE_MODELS: ImageModel[] = ["gpt-image-1", "gpt-image-1-mini", "gpt-image-1.5", "dall-e-2"];

// Sizes
const IMAGE_SIZES: GptImageSize[] = ["1024x1024", "1536x1024", "1024x1536", "auto"];

// Qualities
const IMAGE_QUALITIES: ImageQuality[] = ["low", "medium", "high", "auto"];

// Formats
const OUTPUT_FORMATS: OutputFormat[] = ["png", "jpeg", "webp"];

interface ImageEditorProps {
  onImageEdited?: (images: any[]) => void;
}

/**
 * AI Image Editor - Background replacement, object removal, inpainting
 */
export function ImageEditor({ onImageEdited }: ImageEditorProps) {
  const { user } = useAuth();
  const [image, setImage] = useState<File | null>(null);
  const [mask, setMask] = useState<File | null>(null);
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState<ImageModel>("gpt-image-1");
  const [size, setSize] = useState<GptImageSize>("1024x1024");
  const [quality, setQuality] = useState<ImageQuality>("high");
  const [format, setFormat] = useState<OutputFormat>("png");
  const [isEditing, setIsEditing] = useState(false);
  const [editedImages, setEditedImages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const maskInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
    }
  };

  const handleMaskSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMask(file);
    }
  };

  const handleEdit = async () => {
    if (!image || !prompt || !user) return;

    setIsEditing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("image", image);
      formData.append("prompt", prompt);
      if (mask) formData.append("mask", mask);
      formData.append("model", model);
      formData.append("size", size);
      formData.append("quality", quality);
      formData.append("outputFormat", format);

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
    } finally {
      setIsEditing(false);
    }
  };

  const handleVariation = async () => {
    if (!image || !user) return;

    setIsEditing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("image", image);
      formData.append("model", "dall-e-2");
      formData.append("size", size);

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
    } finally {
      setIsEditing(false);
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

            {/* Edit Actions */}
            <div className="flex gap-2">
              <Button
                onClick={handleEdit}
                disabled={!image || !prompt || isEditing || !user}
                className="flex-1"
              >
                {isEditing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Editing...
                  </>
                ) : (
                  "Edit Image"
                )}
              </Button>
              <Button
                onClick={handleVariation}
                disabled={!image || isEditing || !user}
                variant="outline"
                className="flex-1"
              >
                {isEditing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Variations"
                )}
              </Button>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
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
                    <div className="absolute inset-0 flex items-center justify-center gap-2 rounded-lg bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `edited-${index}.${format}`;
                          a.click();
                        }}
                      >
                        Download
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex min-h-96 flex-col items-center justify-center rounded-lg border-2 border-dashed">
                {isEditing ? (
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