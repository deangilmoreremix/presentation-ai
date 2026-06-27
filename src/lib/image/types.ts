/**
 * Image Generation Types and Constants
 * Supports all OpenAI image models and the Responses API,
 * including v2 features (gpt-image-1 / gpt-image-1.5 / gpt-image-1-mini).
 */

// Image Models
export type ImageModel =
  | "gpt-image-1"
  | "gpt-image-1-mini"
  | "gpt-image-1.5"
  | "dall-e-3"
  | "dall-e-2";

// Image Sizes (varies by model) - for DALL-E, also includes legacy sizes
export type ImageSize = "1024x1024" | "1536x1024" | "1024x1536";

// Image Sizes for gpt-image models (includes auto)
export type GptImageSize = ImageSize | "auto";

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

// v2: relaxed content moderation for gpt-image models
export type ImageModeration = "low" | "auto";

// v2: edit fidelity for gpt-image-* edit calls
export type InputFidelity = "low" | "high" | "auto";

// v2: response format selection (url vs base64)
export type ImageResponseFormat = "url" | "b64_json";

// v2: chat-style message content for generate/edit prompts
export interface ImageMessageContent {
  type: "text" | "image_url";
  text?: string;
  image_url?: { url: string; detail?: "auto" | "low" | "high" };
}

// Allowed shape for prompt: plain string OR multimodal content array
export type ImagePrompt = string | ImageMessageContent[];

// Image Generation Parameters (v2)
export interface ImageGenerationParams {
  prompt: ImagePrompt;
  model?: ImageModel;
  size?: ImageSize | GptImageSize;
  quality?: ImageQuality;
  outputFormat?: OutputFormat;
  outputCompression?: number;
  background?: ImageBackground;
  n?: number;
  apiKey?: string;
  moderation?: ImageModeration;
  user?: string;
  stream?: boolean;
  responseFormat?: ImageResponseFormat;
}

// Image Edit Parameters (v2)
export interface ImageEditParams {
  image: string | File; // primary input image (URL, base64, or File)
  prompt: ImagePrompt;
  mask?: string | File; // Optional mask for inpainting (base64 RGBA supported in v2)
  inputImages?: (string | File)[]; // additional input images (up to 10 total)
  model?: ImageModel;
  size?: ImageSize | GptImageSize;
  quality?: ImageQuality;
  outputFormat?: OutputFormat;
  outputCompression?: number;
  background?: ImageBackground;
  n?: number;
  apiKey?: string;
  inputFidelity?: InputFidelity;
  moderation?: ImageModeration;
  user?: string;
  stream?: boolean;
  responseFormat?: ImageResponseFormat;
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
  emoji?: string;
  promptPrefix?: string;
  promptSuffix?: string;
  suggestedParams?: Partial<ImageGenerationParams> & {
    inputFidelity?: InputFidelity;
  };
  requiresEdit?: boolean;
  supportsMultiImage?: boolean;
}

// Default values
export const DEFAULT_IMAGE_SIZE: ImageSize = "1024x1024";
export const DEFAULT_IMAGE_MODEL: ImageModel = "gpt-image-1";
export const DEFAULT_IMAGE_QUALITY: ImageQuality = "high";
export const DEFAULT_OUTPUT_FORMAT: OutputFormat = "png";
export const DEFAULT_N = 1;