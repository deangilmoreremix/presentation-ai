"use server";

import { utapi } from "@/app/api/uploadthing/core";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/server";
import { getOpenAIClient } from "@/lib/openai/client";
import {
  DEFAULT_IMAGE_MODEL,
  getGptImageSize,
  OPENAI_IMAGE_MODEL,
  OPENAI_RESPONSES_MODEL,
  type ImageAspectRatio,
  type ImageModelList,
} from "@/constants/image-models";
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
) {
    const openai = await getOpenAIClient(apiKey);

  const response = await openai.responses.create({
    model: OPENAI_RESPONSES_MODEL,
    input: `Draw the following image: ${prompt}`,
    tools: [
      {
        type: "image_generation",
        model: OPENAI_IMAGE_MODEL,
        size: getGptImageSize(aspectRatio),
        // gpt-image-2 doesn't support transparent backgrounds; default to opaque.
        background: "opaque",
      },
    ],
  });

  const imageCalls = response.output.filter(
    (item) => item.type === "image_generation_call",
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

  return { success: true, image };
}

export async function generateImageAction(
  prompt: string,
  _model: ImageModelList = DEFAULT_IMAGE_MODEL,
  aspectRatio: ImageAspectRatio = "16:9",
  apiKey?: string,
) {
  const currentUser = await getCurrentUser();
  if (!currentUser?.id) {
    return { success: false, error: "You must be logged in to generate images" };
  }

  try {
    return await generateOpenAIImage(prompt, currentUser.id, aspectRatio);
  } catch (error) {
    console.error("Error generating image:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to generate image",
    };
  }
}
