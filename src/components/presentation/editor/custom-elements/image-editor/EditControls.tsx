"use client";

import { ImageEditor } from "@/components/image/ImageEditor";

interface EditControlsProps {
  onImageSelect?: (url: string) => void;
}

/**
 * Wraps the standalone ImageEditor for use inside the presentation editor.
 *
 * Adapts the `onImageSelect` callback so edited images can be inserted
 * directly into a slide via the presentation's `handleImageSelect` path.
 */
export function EditControls({ onImageSelect }: EditControlsProps) {
  return <ImageEditor onImageSelect={onImageSelect} />;
}
