"use server";

import { utapi } from "@/app/api/uploadthing/core";
import { env } from "@/env";
import { requireOptionalIntegration } from "@/lib/env/optional-integrations";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import OpenAI from "openai";
import { UTFile } from "uploadthing/server";

export type ImageModelList = "dall-e-3" | "dall-e-2";

async function persistGeneratedImage(
  imageUrl: string,
  prompt: string,
  userId: string,
  filePrefix: string,
) {
  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    throw new Error("Failed to download generated image");
  }

  const imageBlob = await imageResponse.blob();
  const imageBuffer = await imageBlob.arrayBuffer();
  const filename = `${filePrefix}_${Date.now()}.png`;
  const utFile = new UTFile([new Uint8Array(imageBuffer)], filename);
  const uploadResult = await utapi.uploadFiles([utFile]);

  if (!uploadResult[0]?.data?.ufsUrl) {
    throw new Error("Failed to upload generated image");
  }

  return db.generatedImage.create({
    data: {
      url: uploadResult[0].data.ufsUrl,
      prompt,
      userId,
    },
  });
}

export async function generateImageAction(
  prompt: string,
  model: ImageModelList = "dall-e-3",
) {
  const session = await auth();

  try {
    const apiKeyToUse = model ? env.OPENAI_API_KEY : undefined;

    if (!apiKeyToUse) {
      return {
        success: false,
        error: "OpenAI API key is required for image generation",
      };
    }

    const openai = new OpenAI({ apiKey: apiKeyToUse });

    console.log(`Generating image with OpenAI DALL-E model: ${model}`);

    const result = await openai.images.generate({
      model,
      prompt,
      n: 1,
      size: "1024x1024",
      response_format: "url",
    });

    if (!result.data || result.data.length === 0) {
      throw new Error("Failed to generate image: no data returned");
    }

    const firstImage = result.data[0];
    if (!firstImage) {
      throw new Error("Failed to generate image: no image data");
    }

    const imageUrl = firstImage.url;
    if (!imageUrl) {
      throw new Error("Failed to generate image: no URL returned");
    }

    const image = await persistGeneratedImage(imageUrl, prompt, session!.user.id, "image");

    return {
      success: true,
      image,
    };
  } catch (error) {
    console.error("Error generating image:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate image",
    };
  }
}