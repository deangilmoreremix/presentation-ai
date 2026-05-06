"use server";

import { utapi } from "@/app/api/uploadthing/core";
import { env } from "@/env";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { getOpenAIClient } from "@/lib/openai/client";
import { UTFile } from "uploadthing/server";

export type ImageModelList = "dall-e-3" | "dall-e-2";

export async function generateImageAction(
  prompt: string,
  model: ImageModelList = "dall-e-3",
  apiKey?: string,
) {
  // Get the current session (now always returns anonymous user)
  const session = await auth();

  try {
    const openai = await getOpenAIClient(session!.user.id, apiKey);

    console.log(`Generating image with OpenAI DALL-E model: ${model}`);

    // Generate image using OpenAI DALL-E
    const response = await openai.images.generate({
      model: model,
      prompt: prompt,
      n: 1,
      size: "1024x1024",
      response_format: "url",
    });

    if (!response.data || response.data.length === 0) {
      throw new Error("Failed to generate image: no data returned");
    }

    const firstImage = response.data[0];
    if (!firstImage) {
      throw new Error("Failed to generate image: no image data");
    }

    const imageUrl = firstImage.url;
    if (!imageUrl) {
      throw new Error("Failed to generate image: no URL returned");
    }

    console.log(`Generated image URL: ${imageUrl}`);

    // Download the image from OpenAI's temporary URL
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to download image: ${imageResponse.statusText}`);
    }

    const imageBlob = await imageResponse.blob();
    const imageBuffer = await imageBlob.arrayBuffer();
    const filename = `${prompt.substring(0, 20).replace(/[^a-z0-9]/gi, "_")}_${Date.now()}.png`;
    const utFile = new UTFile([new Uint8Array(imageBuffer)], filename);

    // Upload to UploadThing for permanent storage
    const uploadResult = await utapi.uploadFiles([utFile]);
    if (!uploadResult[0]?.data?.ufsUrl) {
      console.error("Upload error:", uploadResult[0]?.error);
      throw new Error("Failed to upload image to storage");
    }

    const permanentUrl = uploadResult[0].data.ufsUrl;
    console.log(`Uploaded to storage: ${permanentUrl}`);

    // Save to database
    const image = await db.generatedImage.create({
      data: {
        url: permanentUrl,
        prompt,
        userId: session.user.id,
      },
    });

    return {
      success: true,
      image,
    };
  } catch (error) {
    console.error("Image generation error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate image",
    };
  }
}