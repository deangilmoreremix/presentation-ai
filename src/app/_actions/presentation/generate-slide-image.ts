"use server";

import { utapi } from "@/app/api/uploadthing/core";
import { env } from "@/env";
import { requireOptionalIntegration } from "@/lib/env/optional-integrations";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { fal } from "@fal-ai/client";
import { UTFile } from "uploadthing/server";

const DEFAULT_SLIDE_IMAGE_MODEL = "fal-ai/flux-2/flash";

export async function generateSlideImageAction(
  prompt: string,
  imageModel: string = DEFAULT_SLIDE_IMAGE_MODEL,
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
    const falConfig = requireOptionalIntegration({
      integration: "FAL",
      envVar: "FAL_API_KEY",
      value: env.FAL_API_KEY,
      feature: "slide image generation",
    });

    if (!falConfig.ok) {
      return { success: false, error: falConfig.error };
    }

    fal.config({ credentials: falConfig.value });
    console.log(`Generating slide image with model: ${imageModel}`);

    const result = await fal.subscribe(imageModel, {
      input: {
        prompt: prompt,
        num_images: 1,
        aspect_ratio: "16:9",
      },
    });

    const imageUrl = result.data?.images?.[0]?.url;
    if (!imageUrl) {
      console.log("Failed to generate slide image", result);
      throw new Error("Failed to generate slide image");
    }

    console.log(`Generated slide image URL: ${imageUrl}`);

    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error("Failed to download image from fal.ai");
    }

    const imageBlob = await imageResponse.blob();
    const imageBuffer = await imageBlob.arrayBuffer();
    const filename = `slide_${Date.now()}.png`;
    const utFile = new UTFile([new Uint8Array(imageBuffer)], filename);
    const uploadResult = await utapi.uploadFiles([utFile]);

    if (!uploadResult[0]?.data?.ufsUrl) {
      console.error("Upload error:", uploadResult[0]?.error);
      throw new Error("Failed to upload image to UploadThing");
    }

    const permanentUrl = uploadResult[0].data.ufsUrl;
    console.log(`Uploaded slide image to: ${permanentUrl}`);

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
