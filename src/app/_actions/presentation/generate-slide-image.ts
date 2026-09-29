"use server";

import { utapi } from "@/app/api/uploadthing/core";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { getOpenAIClient } from "@/lib/openai/client";
import { UTFile } from "uploadthing/server";
import {
  OPENAI_RESPONSES_MODEL,
  type ImageModelList,
} from "@/constants/image-models";
import { type ImageBackground, type ImageGenerationMode, type ImageQuality, type OutputFormat } from "@/lib/image/types";

const DEFAULT_SLIDE_IMAGE_MODEL = "openai/gpt-image-2.5-sunburst";

export async function generateSlideImageAction(
  prompt: string,
  imageModel: ImageModelList = DEFAULT_SLIDE_IMAGE_MODEL,
  apiKey?: string,
  options?: {
    size?: string;
    quality?: ImageQuality;
    outputFormat?: OutputFormat;
    outputCompression?: number;
    background?: ImageBackground;
    mode?: ImageGenerationMode;
    previousResponseId?: string;
    inputFidelity?: "high" | "low";
    moderation?: "low" | "auto";
    userId?: string;
    referenceImages?: Array<{ url: string; role?: string }>;
    mask?: { url?: string; base64?: string; x?: number; y?: number; width?: number; height?: number };
  },
) {
  const currentUser = await getCurrentUser();

  if (!currentUser?.id) {
    return { success: false, error: "You must be logged in to generate images" };
  }
  if (!currentUser.isAdmin) {
    return {
      success: false,
      error: "This feature is only available for admin users",
    };
  }

  try {
    const openai = await getOpenAIClient(apiKey);

    const tool: Record<string, unknown> = {
      type: "image_generation",
      model: imageModel.replace("openai/", ""),
      size: options?.size || "1536x1024",
      background: options?.background || "opaque",
      action: options?.mode === "generate" || !options?.mode ? "auto" : options.mode,
    };

    if (options?.quality) tool.quality = options.quality;
    if (options?.outputFormat) tool.output_format = options.outputFormat;
    if (options?.outputCompression !== undefined) tool.output_compression = options.outputCompression;
    if (options?.previousResponseId) tool.previous_response_id = options.previousResponseId;
    if (options?.inputFidelity) tool.input_fidelity = options.inputFidelity;
    if (options?.referenceImages && options.referenceImages.length > 0) {
      tool.input_image = options.referenceImages.map((ref) => ({
        type: "input_image",
        image_url: ref.url,
        role: ref.role || "other",
      }));
    }
    if (options?.mask) {
      tool.mask = options.mask.url || options.mask.base64;
      if (options.mask.x !== undefined) tool.mask_x = options.mask.x;
      if (options.mask.y !== undefined) tool.mask_y = options.mask.y;
      if (options.mask.width !== undefined) tool.mask_width = options.mask.width;
      if (options.mask.height !== undefined) tool.mask_height = options.mask.height;
    }

    const response = await openai.responses.create({
      model: OPENAI_RESPONSES_MODEL,
      input: `Draw a 16:9 presentation slide image: ${prompt}`,
      tools: [tool as any],
      ...(options?.moderation ? { moderation: options.moderation } : {}),
      ...(options?.userId ? { user: options.userId } : {}),
    });

    const imageCalls = response.output.filter(
      (item: any) => item.type === "image_generation_call",
    ) as any[];

    const base64 = imageCalls[0]?.result;
    if (!base64) {
      throw new Error("Failed to generate slide image");
    }

    const imageBuffer = Buffer.from(base64, "base64");
    const filename = `slide_${Date.now()}.png`;
    const utFile = new UTFile([new Uint8Array(imageBuffer)], filename);
    const uploadResult = await utapi.uploadFiles([utFile]);

    if (!uploadResult[0]?.data?.ufsUrl) {
      throw new Error("Failed to upload image to UploadThing");
    }

    const permanentUrl = uploadResult[0].data.ufsUrl;

    const supabase = await createClient();
    if (!supabase) {
      throw new Error("Supabase is not configured");
    }

    const { data: generatedImage, error } = await supabase
      .from("generated_images")
      .insert({
        url: permanentUrl,
        prompt,
        user_id: currentUser.id,
      })
      .select("*")
      .single();

    if (error) throw error;

    return { success: true, image: generatedImage, responseId: response.id };
  } catch (error) {
    console.error("Error generating slide image:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to generate slide image",
    };
  }
}
