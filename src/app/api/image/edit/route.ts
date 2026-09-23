import { type NextRequest, NextResponse } from "next/server"
import { csrfGuard } from "@/lib/csrf";
import { getOpenAIClient } from "@/lib/openai/client";
import { utapi } from "@/app/api/uploadthing/core";
import { UTFile } from "uploadthing/server";
import type OpenAI from "openai";
import {
  type ImageModel,
  type GptImageSize,
  type ImageQuality,
  type OutputFormat,
  type ImageBackground,
} from "@/lib/image/types";

export async function POST(req: NextRequest) {
  try {
    const csrfError = csrfGuard(req);
    if (csrfError) return csrfError;

    const contentType = req.headers.get("content-type") || "";
    let prompt: string;
    let model: ImageModel;
    let size: GptImageSize;
    let quality: ImageQuality | undefined;
    let outputFormat: OutputFormat | undefined;
    let outputCompression: number | undefined;
    let background: ImageBackground | undefined;
    let inputFidelity: "high" | "low" | undefined;
    let moderation: "low" | "auto" | undefined;
    let n: number;
    let apiKey: string | undefined;
    let images: Array<{ url?: string; file_id?: string }> = [];
    let mask: { url?: string; file_id?: string } | undefined;
    let stream = false;
    let partialImages: number | undefined;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      prompt = (formData.get("prompt") as string) || "";
      model = ((formData.get("model") as string) || "gpt-image-1.5") as ImageModel;
      size = ((formData.get("size") as string) || "1024x1024") as GptImageSize;
      quality = formData.get("quality") as ImageQuality | undefined;
      outputFormat = formData.get("outputFormat") as OutputFormat | undefined;
      outputCompression = formData.get("outputCompression") ? Number(formData.get("outputCompression")) : undefined;
      background = formData.get("background") as ImageBackground | undefined;
      inputFidelity = formData.get("inputFidelity") as "high" | "low" | undefined;
      moderation = formData.get("moderation") as "low" | "auto" | undefined;
      n = Number(formData.get("n")) || 1;
      apiKey = formData.get("apiKey") as string | undefined;
      stream = (formData.get("stream") as string) === "true";
      partialImages = formData.get("partialImages") ? Number(formData.get("partialImages")) : undefined;

      const imageFile = formData.get("image") as File | null;
      const maskFile = formData.get("mask") as File | null;

      if (imageFile) {
        const imageUrl = URL.createObjectURL(imageFile);
        images = [{ url: imageUrl }];
      }

      if (maskFile) {
        const maskUrl = URL.createObjectURL(maskFile);
        mask = { url: maskUrl };
      }
    } else {
      const body = await req.json();
      prompt = body.prompt || "";
      model = body.model || "gpt-image-1.5";
      size = body.size || "1024x1024";
      quality = body.quality;
      outputFormat = body.outputFormat;
      outputCompression = body.outputCompression;
      background = body.background;
      inputFidelity = body.inputFidelity;
      moderation = body.moderation;
      n = body.n || 1;
      apiKey = body.apiKey;
      images = body.images || [];
      mask = body.mask;
      stream = body.stream || false;
      partialImages = body.partialImages;
    }

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    if (images.length === 0) {
      return NextResponse.json({ error: "At least one image is required" }, { status: 400 });
    }

    const openai = await getOpenAIClient(undefined, apiKey);

    const requestParams: Record<string, unknown> = {
      model,
      images,
      prompt,
      n,
      size,
      ...(quality ? { quality } : {}),
      ...(outputFormat ? { output_format: outputFormat } : {}),
      ...(outputCompression !== undefined ? { output_compression: outputCompression } : {}),
      ...(background ? { background } : {}),
      ...(inputFidelity ? { input_fidelity: inputFidelity } : {}),
      ...(moderation ? { moderation } : {}),
      ...(stream ? { stream } : {}),
      ...(partialImages !== undefined ? { partial_images: partialImages } : {}),
    };

    if (mask) {
      requestParams.mask = mask;
    }

    const response = await openai.images.edit(requestParams as any);

    if (!response.data || response.data.length === 0) {
      throw new Error("Failed to edit image: no data returned");
    }

    const uploadedUrls: string[] = [];

    for (let i = 0; i < response.data.length; i++) {
      const imageData = response.data[i];
      if (!imageData) continue;

      let imageBuffer: Buffer;

      if (imageData.b64_json) {
        imageBuffer = Buffer.from(imageData.b64_json, "base64");
      } else if (imageData.url) {
        const imageResponse = await fetch(imageData.url);
        if (!imageResponse.ok) {
          throw new Error(`Failed to download edited image ${i}: ${imageResponse.statusText}`);
        }
        const blob = await imageResponse.blob();
        imageBuffer = Buffer.from(await blob.arrayBuffer());
      } else {
        continue;
      }

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
