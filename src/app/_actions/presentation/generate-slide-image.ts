"use server";

import { utapi } from "@/app/api/uploadthing/core";
import { env } from "@/env";
import { requireOptionalIntegration } from "@/lib/env/optional-integrations";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import OpenAI from "openai";
import { UTFile } from "uploadthing/server";

// OpenAI DALL-E models for slide images
export type ImageModelList = "dall-e-3" | "dall-e-2";

const DEFAULT_SLIDE_IMAGE_MODEL: ImageModelList = "dall-e-3";

export async function generateSlideImageAction(
  prompt: string,
  imageModel: ImageModelList = DEFAULT_SLIDE_IMAGE_MODEL,
) {
  const session = await auth();

  // Admin only feature
  if (!session.user.isAdmin) {
    return {
      success: false,
      error: "This feature is only available for admin users",
    };
  }

  try {
    const openaiConfig = requireOptionalIntegration({
      integration: "OpenAI",
      envVar: "OPENAI_API_KEY",
      value: env.OPENAI_API_KEY,
      feature: "AI image generation",
    });

    if (!openaiConfig.ok) {
      return {
        success: false,
        error: openaiConfig.error,
      };
    }

    const openai = new OpenAI({ apiKey: openaiConfig.value });

    console.log(`Generating slide image with model: ${imageModel}`);

    const result = await openai.images.generate({
      model: imageModel,
      prompt: prompt,
      n: 1,
      size: "1024x1024",
      response_format: "url",
    });

    if (!result.data || result.data.length === 0) {
      throw new Error("Failed to generate slide image: no data returned");
    }

    const firstImage = result.data[0];
    if (!firstImage) {
      throw new Error("Failed to generate slide image: no image data");
    }

    const imageUrl = firstImage.url;
    if (!imageUrl) {
      console.log("Failed to generate slide image", result);
      throw new Error("Failed to generate slide image");
    }

    console.log(`Generated slide image URL: ${imageUrl}`);

    // Download the image from OpenAI's temporary URL
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error("Failed to download image from OpenAI");
    }

    const imageBlob = await imageResponse.blob();
    const imageBuffer = await imageBlob.arrayBuffer();

    // Generate a filename
    const filename = `slide_${Date.now()}.png`;

    // Create a UTFile from the downloaded image
    const utFile = new UTFile([new Uint8Array(imageBuffer)], filename);

    // Upload to UploadThing
    const uploadResult = await utapi.uploadFiles([utFile]);

    if (!uploadResult[0]?.data?.ufsUrl) {
      console.error("Upload error:", uploadResult[0]?.error);
      throw new Error("Failed to upload image to UploadThing");
    }

    const permanentUrl = uploadResult[0].data.ufsUrl;
    console.log(`Uploaded slide image to: ${permanentUrl}`);

    // Store in database
    const generatedImage = await db.generatedImage.create({
      data: {
        url: permanentUrl,
        prompt: prompt,
        userId: session.user.id,
      },
    });

    return {
      success: true,
      image: generatedImage,
    };
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
