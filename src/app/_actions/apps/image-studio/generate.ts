"use server";

import { utapi } from "@/app/api/uploadthing/core";
import { env } from "@/env";
import { requireOptionalIntegration } from "@/lib/env/optional-integrations";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { getOpenAIClient } from "@/lib/openai/client";
import { UTFile } from "uploadthing/server";
import type {
  ImageModel,
  ImageSize,
  ImageQuality,
  OutputFormat,
  ImageBackground,
} from "@/lib/image/types";

const DEFAULT_MODEL: ImageModel = "gpt-image-1";
const DEFAULT_SIZE: ImageSize = "1024x1024";

async function persistGeneratedImage(
  imageUrl: string,
  prompt: string,
  userId: string,
  filePrefix: string,
  metadata?: {
    model?: ImageModel;
    size?: ImageSize;
    quality?: ImageQuality;
    format?: OutputFormat;
    compression?: number;
    background?: ImageBackground;
    n?: number;
  },
) {
  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    throw new Error("Failed to download generated image");
  }

  const imageBlob = await imageResponse.blob();
  const imageBuffer = await imageBlob.arrayBuffer();
  const filename = `${filePrefix}_${Date.now()}.${metadata?.format || "png"}`;
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
      model: metadata?.model,
      size: metadata?.size,
      quality: metadata?.quality,
      format: metadata?.format,
      compression: metadata?.compression,
      background: metadata?.background,
      n: metadata?.n,
    },
  });
}

// Enhanced image generation for Image Studio
export async function generateImageAction(
  prompt: string,
  params?: {
    model?: ImageModel;
    size?: ImageSize;
    quality?: ImageQuality;
    outputFormat?: OutputFormat;
    outputCompression?: number;
    background?: ImageBackground;
    n?: number;
    apiKey?: string;
  },
) {
  const session = await auth();

  try {
    const {
      model = DEFAULT_MODEL,
      size = DEFAULT_SIZE,
      quality,
      outputFormat,
      outputCompression,
      background,
      n = 1,
    } = params ?? {};

    const apiKeyToUse = params?.apiKey || env.OPENAI_API_KEY;

    if (!apiKeyToUse) {
      return {
        success: false,
        error: "OpenAI API key is required for image generation",
      };
    }

    const openai = await getOpenAIClient(session!.user.id, apiKeyToUse);

    console.log(`Generating image with OpenAI model: ${model}`, {
      size,
      quality,
      outputFormat,
      n,
    });

    // Build request params
    const requestParams: OpenAI.ImageGenerateParams = {
      model,
      prompt,
      n,
      size,
      response_format: "url",
    };

    // Add gpt-image-1+ specific parameters
    if (model.startsWith("gpt-image")) {
      if (quality) requestParams.quality = quality;
      if (outputFormat) requestParams.output_format = outputFormat;
      if (outputCompression !== undefined) requestParams.output_compression = outputCompression;
      if (background) requestParams.background = background;
    }

    const result = await openai.images.generate(requestParams);

    if (!result.data || result.data.length === 0) {
      throw new Error("Failed to generate image: no data returned");
    }

    const uploadedUrls: string[] = [];
    const metadata = { model, size, quality, format: outputFormat, compression: outputCompression, background, n };

    for (let i = 0; i < result.data.length; i++) {
      const imageUrl = result.data[i]?.url;
      if (!imageUrl) continue;

      const image = await persistGeneratedImage(
        imageUrl,
        prompt,
        session!.user.id,
        `image_${i}`,
        metadata,
      );
      uploadedUrls.push(image.url);
    }

    if (uploadedUrls.length === 0) {
      throw new Error("Failed to generate any images");
    }

    return {
      success: true,
      images: await db.generatedImage.findMany({
        where: { userId: session.user.id, prompt },
      }),
    };
  } catch (error) {
    console.error("Error generating image:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate image",
    };
  }
}