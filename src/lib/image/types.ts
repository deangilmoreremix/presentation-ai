/**
 * Image Generation Types and Constants
 * Supports all OpenAI image models and the Responses API
 */

// Image Models - OpenAI image models (gpt-image-2.5 is used via the Responses API)
export type ImageModel =
  | "gpt-image-2.5-flare"
  | "gpt-image-2.5-sunburst"
  | "gpt-image-2.5"
  | "gpt-image-2"
  | "gpt-image-1"
  | "gpt-image-1-mini"
  | "gpt-image-1.5"
  | "dall-e-3"
  | "dall-e-2";

// Image Sizes (varies by model) - for DALL-E, also includes legacy sizes
export type ImageSize = "1024x1024" | "1536x1024" | "1024x1536" | "2048x2048" | "2048x1152" | "3840x2160" | "2160x3840";

// Image Sizes for gpt-image models (includes auto)
export type GptImageSize = ImageSize | "auto";

// Image Quality
export type ImageQuality = "low" | "medium" | "high" | "xhigh" | "max" | "auto";

// Output Formats
export type OutputFormat = "png" | "jpeg" | "webp";

// Background Options
export type ImageBackground = "auto" | "transparent" | "opaque";

// Input fidelity for edits
export type InputFidelity = "high" | "low";

// Moderation level
export type ModerationLevel = "low" | "auto";

// Image Action Types (for Responses API)
export type ImageAction = "generate" | "edit" | "auto";

// Image generation mode
export type ImageGenerationMode = "generate" | "edit" | "edit-mask" | "style-transfer" | "object-removal" | "background-removal";

// Image history entry for multi-turn refinement
export interface ImageHistoryEntry {
  id: string;
  url: string;
  prompt: string;
  model: ImageModel;
  size: GptImageSize;
  quality: ImageQuality;
  background: ImageBackground;
  outputFormat: OutputFormat;
  previousResponseId?: string;
  parentId?: string;
  branchName: string;
  inputFidelity?: InputFidelity;
  moderation?: ModerationLevel;
  createdAt: Date;
  metadata?: Record<string, unknown>;
}

// Image generation session/history
export interface ImageGenerationSession {
  id: string;
  entries: ImageHistoryEntry[];
  currentEntryId: string | null;
  branches: Record<string, string[]>; // branchName -> entry ids
  activeBranch: string;
  createdAt: Date;
  updatedAt: Date;
}

// Mask data for inpainting
export interface ImageMaskData {
  id: string;
  url: string; // base64 or uploaded mask image url
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  format?: "url" | "base64";
}

// Reference image for edits
export interface ImageReference {
  id: string;
  url: string;
  role: "subject" | "style" | "clothing" | "background" | "other";
  description?: string;
}

// A/B test entry
export interface ImageABTestEntry {
  id: string;
  sessionId: string;
  modelA: ImageModel;
  modelB: ImageModel;
  promptA: string;
  promptB: string;
  resultA?: { url: string; latencyMs?: number };
  resultB?: { url: string; latencyMs?: number };
  winner?: "A" | "B" | "tie";
  status: "running" | "completed" | "failed";
  createdAt: Date;
}

// Streaming chunk for progressive image display
export interface ImageStreamChunk {
  id: string;
  sessionId: string;
  type: "progress" | "partial" | "complete" | "error";
  dataUrl?: string;
  progress?: number; // 0-100
  message?: string;
  timestamp: Date;
}

// Image Categories for the Image Studio
export type ImageCategory = 
  | "core"
  | "marketing"
  | "branding"
  | "product"
  | "content"
  | "editing"
  | "composition"
  | "consistency"
  | "ui-ux"
  | "educational"
  | "storytelling"
  | "real-estate"
  | "fashion"
  | "automation"
  | "saas-products";

// Image Generation Parameters
export interface ImageGenerationParams {
  prompt: string;
  model?: ImageModel;
  size?: ImageSize;
  quality?: ImageQuality;
  outputFormat?: OutputFormat;
  outputCompression?: number;
  background?: ImageBackground;
  n?: number;
  apiKey?: string;
}

// Image Edit Parameters
export interface ImageEditParams {
  image: string | File; // URL, base64, or File
  prompt: string;
  mask?: string | File; // Optional mask for inpainting
  model?: ImageModel;
  size?: ImageSize;
  quality?: ImageQuality;
  outputFormat?: OutputFormat;
  outputCompression?: number;
  background?: ImageBackground;
  n?: number;
  apiKey?: string;
}

// Image Variation Parameters
export interface ImageVariationParams {
  image: string | File;
  model?: ImageModel;
  size?: ImageSize;
  n?: number;
  apiKey?: string;
}

// Responses API Image Parameters
export interface ResponsesImageParams {
  input: string;
  model?: string;
  imageModel?: ImageModel;
  size?: ImageSize;
  quality?: ImageQuality;
  outputFormat?: OutputFormat;
  outputCompression?: number;
  background?: ImageBackground;
  action?: ImageAction;
  previousResponseId?: string;
  n?: number;
  apiKey?: string;
}

// Generated Image with metadata
export interface GeneratedImageWithMetadata {
  id: string;
  url: string;
  prompt: string;
  model: ImageModel;
  size: ImageSize;
  quality?: ImageQuality;
  format?: OutputFormat;
  compression?: number;
  background?: ImageBackground;
  action?: ImageAction;
  previousResponseId?: string;
  n: number;
  createdAt: Date;
  userId: string;
}

// Image Category Template
export interface ImageTemplate {
  id: string;
  category: ImageCategory;
  name: string;
  description: string;
  promptPrefix?: string;
  promptSuffix?: string;
  suggestedParams?: Partial<ImageGenerationParams>;
}

// Default values
export const DEFAULT_IMAGE_SIZE: ImageSize = "1024x1024";
export const DEFAULT_IMAGE_MODEL: ImageModel = "gpt-image-2.5";
export const DEFAULT_IMAGE_QUALITY: ImageQuality = "high";
export const DEFAULT_OUTPUT_FORMAT: OutputFormat = "png";
export const DEFAULT_N = 1;