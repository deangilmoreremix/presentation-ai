/**
 * OpenAI image generation.
 * gpt-image-2.5 is invoked through the Responses API image_generation tool
 * (gpt-image-2.5 is the image model behind the tool; the `model` field of the
 * Responses request must be a text-capable mainline model).
 */

import {
  type ImageBackground,
  type ImageGenerationMode,
  type ImageQuality,
  type OutputFormat,
} from "@/lib/image/types";

/** The image model used behind the Responses API image_generation tool. */
export const OPENAI_IMAGE_MODEL = "gpt-image-2.5-sunburst" as const;

/** Mainline text model used to drive the Responses API image_generation tool. */
export const OPENAI_RESPONSES_MODEL = "gpt-5" as const;

export type ImageModelList =
  | "openai/gpt-image-2.5-sunburst"
  | "openai/gpt-image-2.5-flare"
  | "openai/gpt-image-2.5"
  | "openai/gpt-image-2";

export const DEFAULT_IMAGE_MODEL: ImageModelList = "openai/gpt-image-2.5-sunburst";

export type ImageModelOption = {
  value: ImageModelList;
  label: string;
  description?: string;
  adminOnly?: boolean;
};

const IMAGE_MODELS: ImageModelOption[] = [
  {
    value: "openai/gpt-image-2.5-sunburst",
    label: "GPT Image 2.5 Sunburst",
    description: "Best quality, slower",
  },
  {
    value: "openai/gpt-image-2.5-flare",
    label: "GPT Image 2.5 Flare",
    description: "Fast, great quality",
  },
  {
    value: "openai/gpt-image-2.5",
    label: "GPT Image 2.5",
    description: "Balanced quality and speed",
  },
  {
    value: "openai/gpt-image-2",
    label: "GPT Image 2",
    description: "Legacy model",
  },
];

export const getAvailableImageModels = (isAdmin: boolean): ImageModelOption[] =>
  IMAGE_MODELS.filter((model) => isAdmin || !model.adminOnly);

export type GptImageSize = "1024x1024" | "1536x1024" | "1024x1536" | "2048x2048" | "2048x1152" | "3840x2160" | "2160x3840" | "auto";

export type ImageAspectRatio = "16:9" | "1:1" | "4:3" | "3:4" | "9:16";

export const GPT_IMAGE_SIZES: GptImageSize[] = [
  "1024x1024",
  "1536x1024",
  "1024x1536",
  "2048x2048",
  "2048x1152",
  "3840x2160",
  "2160x3840",
  "auto",
];

export const IMAGE_QUALITIES: ImageQuality[] = ["auto", "low", "medium", "high", "xhigh", "max"];

export const IMAGE_BACKGROUNDS: ImageBackground[] = ["auto", "opaque", "transparent"];

export const OUTPUT_FORMATS: OutputFormat[] = ["png", "jpeg", "webp"];

export const IMAGE_COUNTS = [1, 2, 3, 4];

/**
 * Map an aspect ratio to one of gpt-image-2.5's flexible `size` values.
 */
export function getGptImageSize(aspectRatio: ImageAspectRatio): GptImageSize {
  if (aspectRatio === "1:1") return "1024x1024";
  if (aspectRatio === "9:16" || aspectRatio === "3:4") return "1024x1536";
  return "1536x1024";
}

export function getGptImageSizeLabel(size: GptImageSize): string {
  if (size === "auto") return "Auto";
  return size;
}

export function isValidGptImageSize(size: string): size is GptImageSize {
  return GPT_IMAGE_SIZES.includes(size as GptImageSize);
}

export function parseCustomImageSize(input: string): GptImageSize | null {
  const trimmed = input.trim();
  if (trimmed === "auto") return "auto";
  if (!/^\d+x\d+$/i.test(trimmed)) return null;
  const [widthStr, heightStr] = trimmed.split("x");
  const width = parseInt(widthStr ?? "", 10);
  const height = parseInt(heightStr ?? "", 10);
  if (!Number.isFinite(width) || !Number.isFinite(height)) return null;
  if (width <= 0 || height <= 0) return null;
  if (width > 3840 || height > 3840) return null;
  if (width % 16 !== 0 || height % 16 !== 0) return null;
  const maxEdge = Math.max(width, height);
  const minEdge = Math.min(width, height);
  if (maxEdge / minEdge > 3) return null;
  const totalPixels = width * height;
  if (totalPixels < 655360 || totalPixels > 8294400) return null;
  return trimmed as GptImageSize;
}

export function getImageQualityLabel(quality: ImageQuality): string {
  const labels: Record<ImageQuality, string> = {
    auto: "Auto",
    low: "Low",
    medium: "Medium",
    high: "High",
    xhigh: "Extra High",
    max: "Max",
  };
  return labels[quality];
}
