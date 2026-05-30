"use server";

import { utapi } from "@/app/api/uploadthing/core";
import { env } from "@/env";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { getOpenAIClient } from "@/lib/openai/client";
import { UTFile } from "uploadthing/server";
import OpenAI from "openai";
import type {
  ImageModel,
  ImageSize,
  ImageQuality,
  OutputFormat,
  ImageBackground,
} from "@/lib/image/types";

const DEFAULT_MODEL: ImageModel = "gpt-image-1";
const DEFAULT_SIZE: ImageSize = "1024x1024";

// Enhanced image generation supporting all OpenAI image models and parameters
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
    const openai = await getOpenAIClient(session!.user.id, params?.apiKey);

    const {
      model = DEFAULT_MODEL,
      size = DEFAULT_SIZE,
      quality,
      outputFormat,
      outputCompression,
      background,
      n = 1,
    } = params ?? {};

    console.log(`Generating image with OpenAI model: ${model}`, {
      size,
      quality,
      outputFormat,
      n,
    });

    // Build request params based on model type
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

    const response = await openai.images.generate(requestParams);

    if (!response.data || response.data.length === 0) {
      throw new Error("Failed to generate image: no data returned");
    }

    const images = response.data;
    const uploadedUrls: string[] = [];

    // Process each generated image
    for (let i = 0; i < images.length; i++) {
      const imageUrl = images[i]?.url;
      if (!imageUrl) continue;

      // Download the image from OpenAI's temporary URL
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error(`Failed to download image ${i}: ${imageResponse.statusText}`);
      }

      const imageBlob = await imageResponse.blob();
      const imageBuffer = await imageBlob.arrayBuffer();
      const filename = `${prompt.substring(0, 20).replace(/[^a-z0-9]/gi, "_")}_${Date.now()}_${i}.${outputFormat || "png"}`;
      const utFile = new UTFile([new Uint8Array(imageBuffer)], filename);

      // Upload to UploadThing for permanent storage
      const uploadResult = await utapi.uploadFiles([utFile]);
      if (!uploadResult[0]?.data?.ufsUrl) {
        throw new Error(`Failed to upload image ${i} to storage`);
      }

      uploadedUrls.push(uploadResult[0].data.ufsUrl);
    }

    // Save all images to database
    const dbImages = await Promise.all(
      uploadedUrls.map((url, index) =>
        db.generatedImage.create({
          data: {
            url,
            prompt,
            userId: session.user.id,
            model,
            size,
            quality: quality ?? undefined,
            format: outputFormat ?? undefined,
            compression: outputCompression ?? undefined,
            background: background ?? undefined,
            n,
          },
        }),
      ),
    );

    return {
      success: true,
      images: dbImages,
      count: dbImages.length,
    };
  } catch (error) {
    console.error("Image generation error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate image",
    };
  }
}

// Image editing action - background replacement, object removal, inpainting
export async function editImageAction(
  imageData: string | File | Blob,
  params: {
    prompt: string;
    mask?: string | File | Blob;
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
  const {
    prompt,
    mask,
    model = "gpt-image-1",
    size = DEFAULT_SIZE,
    quality,
    outputFormat,
    outputCompression,
    background,
    n = 1,
  } = params;

  try {
    const openai = await getOpenAIClient(session!.user.id, params.apiKey);

    console.log(`Editing image with OpenAI model: ${model}`);

    // Convert input to proper format for OpenAI
    const imageFile = typeof imageData === "string" ? await fetch(imageData).then(r => r.blob()) : imageData;
    const maskFile = mask ? (typeof mask === "string" ? await fetch(mask).then(r => r.blob()) : mask) : undefined;

    // Build request params
    const requestParams: OpenAI.ImageEditParams = {
      model,
      image: imageFile as File,
      prompt,
      n,
      size,
    };

    if (maskFile) {
      requestParams.mask = maskFile as File;
    }

    // Add gpt-image-1+ specific parameters
    if (model.startsWith("gpt-image")) {
      if (quality) requestParams.quality = quality;
      if (outputFormat) requestParams.output_format = outputFormat;
      if (outputCompression !== undefined) requestParams.output_compression = outputCompression;
    }

    const response = await openai.images.edit(requestParams);

    if (!response.data || response.data.length === 0) {
      throw new Error("Failed to edit image: no data returned");
    }

    const images = response.data;
    const uploadedUrls: string[] = [];

    for (let i = 0; i < images.length; i++) {
      const imageUrl = images[i]?.url;
      if (!imageUrl) continue;

      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error(`Failed to download edited image ${i}: ${imageResponse.statusText}`);
      }

      const imageBlob = await imageResponse.blob();
      const imageBuffer = await imageBlob.arrayBuffer();
      const filename = `edited_${prompt.substring(0, 20).replace(/[^a-z0-9]/gi, "_")}_${Date.now()}_${i}.${outputFormat || "png"}`;
      const utFile = new UTFile([new Uint8Array(imageBuffer)], filename);

      const uploadResult = await utapi.uploadFiles([utFile]);
      if (!uploadResult[0]?.data?.ufsUrl) {
        throw new Error(`Failed to upload edited image ${i} to storage`);
      }

      uploadedUrls.push(uploadResult[0].data.ufsUrl);
    }

    const dbImages = await Promise.all(
      uploadedUrls.map((url, index) =>
        db.generatedImage.create({
          data: {
            url,
            prompt,
            userId: session.user.id,
            model,
            size,
            quality: quality ?? undefined,
            format: outputFormat ?? undefined,
            compression: outputCompression ?? undefined,
            background: background ?? undefined,
            n,
          },
        }),
      ),
    );

    return {
      success: true,
      images: dbImages,
      count: dbImages.length,
    };
  } catch (error) {
    console.error("Image edit error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to edit image",
    };
  }
}

// Image variation action
export async function createVariationAction(
  imageData: string | File | Blob,
  params?: {
    model?: ImageModel;
    n?: number;
    apiKey?: string;
  },
) {
  const session = await auth();
  const { model = "dall-e-2", n = 1 } = params ?? {};

  try {
    const openai = await getOpenAIClient(session!.user.id, params?.apiKey);

    console.log(`Creating variation with OpenAI model: ${model}`);

    const imageFile = typeof imageData === "string" ? await fetch(imageData).then(r => r.blob()) : imageData;

    const response = await openai.images.createVariation({
      model,
      image: imageFile as File,
      n,
    });

    if (!response.data || response.data.length === 0) {
      throw new Error("Failed to create variation: no data returned");
    }

    const images = response.data;
    const uploadedUrls: string[] = [];

    for (let i = 0; i < images.length; i++) {
      const imageUrl = images[i]?.url;
      if (!imageUrl) continue;

      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error(`Failed to download variation ${i}: ${imageResponse.statusText}`);
      }

      const imageBlob = await imageResponse.blob();
      const imageBuffer = await imageBlob.arrayBuffer();
      const filename = `variation_${Date.now()}_${i}.png`;
      const utFile = new UTFile([new Uint8Array(imageBuffer)], filename);

      const uploadResult = await utapi.uploadFiles([utFile]);
      if (!uploadResult[0]?.data?.ufsUrl) {
        throw new Error(`Failed to upload variation ${i} to storage`);
      }

      uploadedUrls.push(uploadResult[0].data.ufsUrl);
    }

const dbImages = await Promise.all(
       uploadedUrls.map((url, index) =>
         db.generatedImage.create({
           data: {
             url,
             prompt: "Variation of uploaded image",
             userId: session.user.id,
             model,
             n,
           },
         }),
       ),
     );

    return {
      success: true,
      images: dbImages,
      count: dbImages.length,
    };
  } catch (error) {
    console.error("Image variation error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create variation",
    };
  }
}

// Responses API image generation (conversational, multi-turn)
export async function generateWithResponsesAPI(
  input: string,
  params?: {
    model?: string; // e.g., "gpt-4o-mini", "gpt-5"
    imageModel?: ImageModel;
    size?: ImageSize;
    quality?: ImageQuality;
    outputFormat?: OutputFormat;
    previousResponseId?: string;
    n?: number;
    apiKey?: string;
  },
) {
  const session = await auth();
  const {
    model = "gpt-4o-mini",
    imageModel = DEFAULT_MODEL,
    size = DEFAULT_SIZE,
    quality,
    outputFormat,
    previousResponseId,
    n = 1,
  } = params ?? {};

  try {
    const openai = await getOpenAIClient(session!.user.id, params?.apiKey);

    console.log(`Generating with Responses API using model: ${model}`);

    const response = await openai.responses.create({
      model,
      input,
      tools: [
        {
          type: "image_generation",
          ...(previousResponseId ? { previous_response_id: previousResponseId } : {}),
        },
      ],
      ...(n > 1 ? { n } : {}),
    });

    // Extract images from response
    const images = response.output
      ?.filter((item: any) => item.type === "image_generation_call")
      .map((item: any) => item.results?.map((r: any) => r.url))
      .flat()
      .filter(Boolean) ?? [];

    if (images.length === 0) {
      throw new Error("No images generated from Responses API");
    }

    const uploadedUrls: string[] = [];

    for (let i = 0; i < images.length; i++) {
      const imageUrl = images[i];
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error(`Failed to download response image ${i}: ${imageResponse.statusText}`);
      }

      const imageBlob = await imageResponse.blob();
      const imageBuffer = await imageBlob.arrayBuffer();
      const filename = `response_${input.substring(0, 20).replace(/[^a-z0-9]/gi, "_")}_${Date.now()}_${i}.${outputFormat || "png"}`;
      const utFile = new UTFile([new Uint8Array(imageBuffer)], filename);

      const uploadResult = await utapi.uploadFiles([utFile]);
      if (!uploadResult[0]?.data?.ufsUrl) {
        throw new Error(`Failed to upload response image ${i} to storage`);
      }

      uploadedUrls.push(uploadResult[0].data.ufsUrl);
    }

    const dbImages = await Promise.all(
      uploadedUrls.map((url, index) =>
        db.generatedImage.create({
          data: {
            url,
            prompt: input,
            userId: session.user.id,
            model: imageModel,
            size,
            quality: quality ?? undefined,
            format: outputFormat ?? undefined,
            previousResponseId,
            action: previousResponseId ? "edit" : "generate",
            n,
          },
        }),
      ),
    );

    return {
      success: true,
      images: dbImages,
      count: dbImages.length,
      responseId: response.id,
    };
  } catch (error) {
    console.error("Responses API image generation error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate image with Responses API",
    };
  }
}