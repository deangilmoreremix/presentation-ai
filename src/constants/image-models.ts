/**
 * OpenAI-only image generation.
 * gpt-image-2 is invoked through the Responses API image_generation tool
 * (gpt-image-2 is the image model behind the tool; the `model` field of the
 * Responses request must be a text-capable mainline model).
 */

/** The image model used behind the Responses API image_generation tool. */
export const OPENAI_IMAGE_MODEL = "gpt-image-2" as const;

/** Mainline text model used to drive the Responses API image_generation tool. */
export const OPENAI_RESPONSES_MODEL = "gpt-5" as const;

export type ImageModelList = "openai/gpt-image-2";

export const DEFAULT_IMAGE_MODEL: ImageModelList = "openai/gpt-image-2";

export type ImageModelOption = {
  value: ImageModelList;
  label: string;
  adminOnly?: boolean;
};

const IMAGE_MODELS: ImageModelOption[] = [
  {
    value: "openai/gpt-image-2",
    label: "GPT Image 2",
  },
];

export const getAvailableImageModels = (isAdmin: boolean): ImageModelOption[] =>
  IMAGE_MODELS.filter((model) => isAdmin || !model.adminOnly);

export type GptImageSize = "1024x1024" | "1536x1024" | "1024x1536" | "auto";

export type ImageAspectRatio = "16:9" | "1:1" | "4:3" | "3:4" | "9:16";

/**
 * Map an aspect ratio to one of gpt-image-2's flexible `size` values.
 */
export function getGptImageSize(aspectRatio: ImageAspectRatio): GptImageSize {
  if (aspectRatio === "1:1") return "1024x1024";
  if (aspectRatio === "9:16" || aspectRatio === "3:4") return "1024x1536";
  return "1536x1024";
}
