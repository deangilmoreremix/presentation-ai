"use client";

import * as React from "react";
import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Upload,
  Trash2,
  ImagePlus,
  X,
} from "lucide-react";
import { type ImageReference } from "@/lib/image/types";

interface ImageReferenceUploaderProps {
  images: ImageReference[];
  onImagesChange: (images: ImageReference[]) => void;
  disabled?: boolean;
  maxImages?: number;
}

export function ImageReferenceUploader({
  images,
  onImagesChange,
  disabled = false,
  maxImages = 5,
}: ImageReferenceUploaderProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;

      Array.from(files).forEach((file) => {
        if (images.length >= maxImages) return;
        const reader = new FileReader();
        reader.onload = () => {
          const newImage: ImageReference = {
            id: `ref_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
            url: reader.result as string,
            role: "other",
          };
          onImagesChange([...images, newImage]);
        };
        reader.readAsDataURL(file);
      });

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [images, maxImages, onImagesChange],
  );

  const handleRemove = (id: string) => {
    onImagesChange(images.filter((img) => img.id !== id));
  };

  const handleRoleChange = (id: string, role: ImageReference["role"]) => {
    onImagesChange(
      images.map((img) => (img.id === id ? { ...img, role } : img)),
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || images.length >= maxImages}
        >
          <Upload className="mr-2 h-3 w-3" />
          Upload Reference
        </Button>
        <span className="text-[10px] text-muted-foreground">
          {images.length}/{maxImages}
        </span>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleUpload}
      />

      {images.length > 0 && (
        <ScrollArea className="h-32">
          <div className="grid grid-cols-3 gap-2">
            {images.map((image) => (
              <div key={image.id} className="group relative">
                <div className="aspect-square overflow-hidden rounded-lg border">
                  <img
                    src={image.url}
                    alt="Reference"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                  <select
                    className="h-6 rounded bg-black/60 px-1 text-[10px] text-white"
                    value={image.role}
                    onChange={(e) =>
                      handleRoleChange(
                        image.id,
                        e.target.value as ImageReference["role"],
                      )
                    }
                    disabled={disabled}
                  >
                    <option value="subject">Subject</option>
                    <option value="style">Style</option>
                    <option value="clothing">Clothing</option>
                    <option value="background">Background</option>
                    <option value="other">Other</option>
                  </select>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-white hover:text-white"
                    onClick={() => handleRemove(image.id)}
                    disabled={disabled}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      <p className="text-[10px] text-muted-foreground">
        Upload images to use as references for editing. Choose a role to guide the generation.
      </p>
    </div>
  );
}
