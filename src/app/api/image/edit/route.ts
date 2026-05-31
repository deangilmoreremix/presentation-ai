import { NextRequest, NextResponse } from "next/server";
import { getOpenAIClient } from "@/lib/openai/client";
import { utapi } from "@/app/api/uploadthing/core";
import { UTFile } from "uploadthing/server";
import OpenAI from "openai";
import type {
  ImageModel,
  GptImageSize,
  ImageQuality,
  OutputFormat,
} from "@/lib/image/types";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const prompt = formData.get("prompt") as string;
    const imageFile = formData.get("image") as File | null;
    const maskFile = formData.get("mask") as File | null;
    const model = (formData.get("model") as ImageModel) || "gpt-image-1";
    const size = (formData.get("size") as GptImageSize) || "1024x1024";
    const quality = formData.get("quality") as ImageQuality | undefined;
    const outputFormat = formData.get("outputFormat") as OutputFormat | undefined;
    const outputCompression = formData.get("outputCompression") ? Number(formData.get("outputCompression")) : undefined;
    const n = Number(formData.get("n")) || 1;
    const apiKey = formData.get("apiKey") as string | undefined;

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    if (!imageFile) {
      return NextResponse.json({ error: "Image file is required" }, { status: 400 });
    }

    const openai = await getOpenAIClient(undefined, apiKey);

    const requestParams: OpenAI.ImageEditParams = {
      model,
      image: imageFile,
      prompt,
      n,
      size,
      response_format: "url",
    };

    if (maskFile) {
      requestParams.mask = maskFile;
    }

    if (model.startsWith("gpt-image")) {
      if (quality) requestParams.quality = quality;
      if (outputFormat) requestParams.output_format = outputFormat;
      if (outputCompression !== undefined) requestParams.output_compression = outputCompression;
    }

    const response = await openai.images.edit(requestParams);

    if (!response.data || response.data.length === 0) {
      throw new Error("Failed to edit image: no data returned");
    }

    const uploadedUrls: string[] = [];

    for (let i = 0; i < response.data.length; i++) {
      const imageUrl = response.data[i]?.url;
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
        throw new Error(`Failed to upload edited image ${i}`);
      }

      uploadedUrls.push(uploadResult[0].data.ufsUrl);
    }

    return NextResponse.json({ success: true, images: uploadedUrls, count: uploadedUrls.length });
  } catch (error) {
    console.error("Image edit API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to edit image" },
      { status: 500 },
    );
  }
}