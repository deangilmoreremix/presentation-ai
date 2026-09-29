"use server";

import { utapi } from "@/app/api/uploadthing/core";
import { createClient, getClerkUserId } from "@/lib/supabase/server";
import { getOpenAIClient } from "@/lib/openai/client";
import {
  DEFAULT_IMAGE_MODEL,
  getGptImageSize,
  OPENAI_RESPONSES_MODEL,
  type ImageAspectRatio,
  type ImageModelList,
} from "@/constants/image-models";
import { type ImageBackground, type ImageGenerationMode } from "@/lib/image/types";
import { UTFile } from "uploadthing/server";

async function persistGeneratedImage(
  imageBuffer: Buffer,
  prompt: string,
  userId: string,
  filePrefix: string,
) {
  const filename = `${filePrefix}_${Date.now()}.png`;
  const utFile = new UTFile([new Uint8Array(imageBuffer)], filename);
  const uploadResult = await utapi.uploadFiles([utFile]);

  const permanentUrl = uploadResult[0]?.data?.ufsUrl;
  if (!permanentUrl) {
    throw new Error("Failed to upload generated image");
  }

  const supabase = await createClient();
  if (!supabase) {
    throw new Error("Supabase is not configured");
  }

  const { data, error } = await supabase
    .from("generated_images")
    .insert({
      url: permanentUrl,
      prompt,
      user_id: userId,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

async function generateOpenAIImage(
  prompt: string,
  userId: string,
  aspectRatio: ImageAspectRatio,
  apiKey?: string,
  model: ImageModelList = DEFAULT_IMAGE_MODEL,
  options?: {
    size?: string;
    quality?: string;
    outputFormat?: string;
    outputCompression?: number;
    background?: ImageBackground;
    mode?: ImageGenerationMode;
    previousResponseId?: string;
    inputFidelity?: "high" | "low";
    moderation?: "low" | "auto";
    userId?: string;
    partialImages?: number;
    referenceImages?: Array<{ url: string; role?: string }>;
    mask?: { url?: string; base64?: string; x?: number; y?: number; width?: number; height?: number };
  },
) {
  const openai = await getOpenAIClient(apiKey);

  const tool: Record<string, unknown> = {
    type: "image_generation",
    model: model.replace("openai/", ""),
    size: options?.size || getGptImageSize(aspectRatio),
    quality: options?.quality || "auto",
    output_format: options?.outputFormat || "png",
    background: options?.background || "opaque",
    action: options?.mode === "generate" || !options?.mode ? "auto" : options.mode,
    ...(options?.inputFidelity ? { input_fidelity: options.inputFidelity } : {}),
    ...(options?.partialImages ? { partial_images: options.partialImages } : {}),
  };

  if (options?.outputCompression !== undefined) {
    tool.output_compression = options.outputCompression;
  }
  if (options?.previousResponseId) {
    tool.previous_response_id = options.previousResponseId;
  }
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
    input: `Draw the following image: ${prompt}`,
    tools: [tool as any],
    ...(options?.moderation ? { moderation: options.moderation } : {}),
    ...(options?.userId ? { user: options.userId } : {}),
  } as any);

  const imageCalls = response.output.filter(
    (item: any) => item.type === "image_generation_call",
  ) as Array<{ result?: string }>;

  const base64 = imageCalls[0]?.result;
  if (!base64) {
    throw new Error("Failed to generate image: no image returned");
  }

  const image = await persistGeneratedImage(
    Buffer.from(base64, "base64"),
    prompt,
    userId,
    "image",
  );

  return {
    success: true,
    image,
    responseId: response.id,
    previousResponseId: response.id,
  };
}

export async function generateImageAction(
  prompt: string,
  model: ImageModelList = DEFAULT_IMAGE_MODEL,
  aspectRatio: ImageAspectRatio = "16:9",
  apiKey?: string,
  options?: {
    size?: string;
    quality?: string;
    outputFormat?: string;
    outputCompression?: number;
    background?: ImageBackground;
    mode?: ImageGenerationMode;
    previousResponseId?: string;
    inputFidelity?: "high" | "low";
    moderation?: "low" | "auto";
    referenceImages?: Array<{ url: string; role?: string }>;
    mask?: { url?: string; base64?: string; x?: number; y?: number; width?: number; height?: number };
  },
) {
  try {
    return await generateOpenAIImage(prompt, await getClerkUserId(), aspectRatio, apiKey, model, options);
  } catch (error) {
    console.error("Error generating image:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to generate image",
    };
  }
}

export async function generateImageStreamAction(
  prompt: string,
  model: ImageModelList = DEFAULT_IMAGE_MODEL,
  aspectRatio: ImageAspectRatio = "16:9",
  apiKey?: string,
  options?: {
    size?: string;
    quality?: string;
    outputFormat?: string;
    background?: ImageBackground;
    mode?: ImageGenerationMode;
    previousResponseId?: string;
    inputFidelity?: "high" | "low";
    moderation?: "low" | "auto";
    partialImages?: number;
    referenceImages?: Array<{ url: string; role?: string }>;
    mask?: { url?: string; base64?: string; x?: number; y?: number; width?: number; height?: number };
    onProgress?: (chunk: { progress: number; message?: string }) => void;
  },
) {
  try {
    const openai = await getOpenAIClient(apiKey);

    const tool: Record<string, unknown> = {
      type: "image_generation",
      model: model.replace("openai/", ""),
      size: options?.size || getGptImageSize(aspectRatio),
      quality: options?.quality || "auto",
      output_format: options?.outputFormat || "png",
      background: options?.background || "opaque",
      action: options?.mode === "generate" || !options?.mode ? "auto" : options.mode,
    };

    if (options?.previousResponseId) {
      tool.previous_response_id = options.previousResponseId;
    }
    if (options?.inputFidelity) {
      tool.input_fidelity = options.inputFidelity;
    }
    if (options?.partialImages) {
      tool.partial_images = options.partialImages;
    }
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

    const streamRaw = await openai.responses.create({
      model: OPENAI_RESPONSES_MODEL,
      input: `Draw the following image: ${prompt}`,
      tools: [tool as any],
      stream: true,
    } as any);

    const stream = streamRaw as unknown as AsyncIterable<{
      type: string;
      progress?: number;
      message?: string;
      partial_image?: string;
      result?: string;
      response_id?: string;
      error?: { message?: string };
    }>;

    const chunks: string[] = [];
    for await (const event of stream) {
      if (event.type === "response.image_generation.progress") {
        options?.onProgress?.({
          progress: event.progress ?? 0,
          message: event.message ?? undefined,
        });
      }
      if (event.type === "response.image_generation_call.partial_image") {
        chunks.push(event.partial_image ?? "");
      }
      if (event.type === "response.image_generation_call.completed") {
        const base64 = event.result;
        if (!base64) {
          throw new Error("Failed to generate image: no image returned");
        }

        const userId = await getClerkUserId();
        const image = await persistGeneratedImage(
          Buffer.from(base64, "base64"),
          prompt,
          userId,
          "image",
        );

        return {
          success: true,
          image,
          responseId: event.response_id,
          previousResponseId: event.response_id,
          chunks,
        };
      }
      if (event.type === "response.error") {
        throw new Error(event.error?.message ?? "Streaming image generation failed");
      }
    }

    throw new Error("Stream ended without completion");
  } catch (error) {
    console.error("Error generating image stream:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to generate image stream",
    };
  }
}
