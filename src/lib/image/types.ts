/**
 * Image Generation Types and Constants
 * Supports all OpenAI image models and the Responses API
 */

// Image Models
export type ImageModel = 
  | "gpt-image-1"
  | "gpt-image-1-mini"
  | "gpt-image-1.5"
  | "dall-e-3"
  | "dall-e-2";

// Image Sizes (varies by model)
export type ImageSize = "1024x1024" | "1536x1024" | "1024x1536" | "auto";

// Image Quality
export type ImageQuality = "low" | "medium" | "high" | "auto";

// Output Formats
export type OutputFormat = "png" | "jpeg" | "webp";

// Background Options
export type ImageBackground = "transparent" | "opaque";

// Image Action Types (for Responses API)
export type ImageAction = "generate" | "edit" | "auto";

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
export const DEFAULT_IMAGE_MODEL: ImageModel = "gpt-image-1";
export const DEFAULT_IMAGE_QUALITY: ImageQuality = "high";
export const DEFAULT_OUTPUT_FORMAT: OutputFormat = "png";
export const DEFAULT_N = 1;