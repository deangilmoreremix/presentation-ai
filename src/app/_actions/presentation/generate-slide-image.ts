"use server";

import { utapi } from "@/app/api/uploadthing/core";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { getOpenAIClient } from "@/lib/openai/client";
import { UTFile } from "uploadthing/server";
import {
  OPENAI_RESPONSES_MODEL,
  type ImageModelList,
} from "@/constants/image-models";

const DEFAULT_SLIDE_IMAGE_MODEL = "openai/gpt-image-2.5";

export async function generateSlideImageAction(
  prompt: string,
  imageModel: ImageModelList = DEFAULT_SLIDE_IMAGE_MODEL,
  apiKey?: string,
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

    const response = await openai.responses.create({
      model: OPENAI_RESPONSES_MODEL,
      input: `Draw a 16:9 presentation slide image: ${prompt}`,
      tools: [
        {
          type: "image_generation",
          model: imageModel.replace("openai/", ""),
          size: "1536x1024",
          background: "opaque",
        },
      ],
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

    return { success: true, image: generatedImage };
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
