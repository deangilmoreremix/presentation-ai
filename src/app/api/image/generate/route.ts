import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getOpenAIClient } from "@/lib/openai/client";
import { utapi } from "@/app/api/uploadthing/core";
import { UTFile } from "uploadthing/server";
import type {
  ImageModel,
  GptImageSize,
  ImageQuality,
  OutputFormat,
  ImageBackground,
  ImageModeration,
  ImageResponseFormat,
  ImagePrompt,
} from "@/lib/image/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_MODELS: ImageModel[] = [
  "gpt-image-1",
  "gpt-image-1-mini",
  "gpt-image-1.5",
  "dall-e-3",
  "dall-e-2",
];

const ALLOWED_SIZES: GptImageSize[] = ["1024x1024", "1536x1024", "1024x1536", "auto"];
const ALLOWED_QUALITIES: ImageQuality[] = ["low", "medium", "high", "auto"];
const ALLOWED_FORMATS: OutputFormat[] = ["png", "jpeg", "webp"];
const ALLOWED_MODERATION: ImageModeration[] = ["low", "auto"];
const ALLOWED_RESPONSE_FORMATS: ImageResponseFormat[] = ["url", "b64_json"];

interface GenerateBody {
  prompt: ImagePrompt;
  model?: ImageModel;
  size?: GptImageSize;
  quality?: ImageQuality;
  outputFormat?: OutputFormat;
  outputCompression?: number;
  background?: ImageBackground;
  n?: number;
  apiKey?: string;
  moderation?: ImageModeration;
  user?: string;
  stream?: boolean;
  responseFormat?: ImageResponseFormat;
  inputFidelity?: unknown;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as GenerateBody;
    const {
      prompt,
      model = "gpt-image-1",
      size = "1024x1024",
      quality,
      outputFormat,
      outputCompression,
      background,
      n = 1,
      apiKey,
      moderation,
      user,
      stream,
      responseFormat = "url",
      inputFidelity,
    } = body;

    if (prompt === undefined || prompt === null) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }
    if (typeof prompt === "string" && prompt.trim() === "") {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }
    if (Array.isArray(prompt) && prompt.length === 0) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    if (!ALLOWED_MODELS.includes(model)) {
      return NextResponse.json(
        { error: `Invalid model. Allowed: ${ALLOWED_MODELS.join(", ")}` },
        { status: 400 },
      );
    }

    if (!ALLOWED_SIZES.includes(size)) {
      return NextResponse.json(
        { error: `Invalid size. Allowed: ${ALLOWED_SIZES.join(", ")}` },
        { status: 400 },
      );
    }

    if (quality !== undefined && !ALLOWED_QUALITIES.includes(quality)) {
      return NextResponse.json(
        { error: `Invalid quality. Allowed: ${ALLOWED_QUALITIES.join(", ")}` },
        { status: 400 },
      );
    }

    if (outputFormat !== undefined && !ALLOWED_FORMATS.includes(outputFormat)) {
      return NextResponse.json(
        { error: `Invalid outputFormat. Allowed: ${ALLOWED_FORMATS.join(", ")}` },
        { status: 400 },
      );
    }

    if (moderation !== undefined && !ALLOWED_MODERATION.includes(moderation)) {
      return NextResponse.json(
        { error: `Invalid moderation. Allowed: ${ALLOWED_MODERATION.join(", ")}` },
        { status: 400 },
      );
    }

    if (!ALLOWED_RESPONSE_FORMATS.includes(responseFormat)) {
      return NextResponse.json(
        { error: `Invalid responseFormat. Allowed: ${ALLOWED_RESPONSE_FORMATS.join(", ")}` },
        { status: 400 },
      );
    }

    if (inputFidelity !== undefined) {
      return NextResponse.json(
        { error: "input_fidelity is only supported on the edit endpoint" },
        { status: 400 },
      );
    }

    if (stream === true) {
      return NextResponse.json(
        {
          error:
            "stream=true is not supported on this endpoint. Use POST /api/image/generate/stream instead.",
        },
        { status: 400 },
      );
    }

    const openai = await getOpenAIClient(undefined, apiKey);

    const requestParams: OpenAI.ImageGenerateParamsNonStreaming = {
      model,
      prompt: typeof prompt === "string" ? prompt : JSON.stringify(prompt),
      n,
      size,
      response_format: responseFormat,
    };

    if (model.startsWith("gpt-image")) {
      if (quality) requestParams.quality = quality;
      if (outputFormat) requestParams.output_format = outputFormat;
      if (outputCompression !== undefined) requestParams.output_compression = outputCompression;
      if (background) requestParams.background = background;
      if (moderation) requestParams.moderation = moderation;
      if (user) requestParams.user = user;
    }

    const response = await openai.images.generate(requestParams);

    if (!response.data || response.data.length === 0) {
      throw new Error("Failed to generate image: no data returned");
    }

    const uploadedUrls: string[] = [];

    for (let i = 0; i < response.data.length; i++) {
      const item = response.data[i];
      if (!item) continue;

      let imageBuffer: ArrayBuffer;
      let ext = outputFormat || "png";

      if (responseFormat === "b64_json" && item.b64_json) {
        const binary = Buffer.from(item.b64_json, "base64");
        imageBuffer = binary.buffer.slice(binary.byteOffset, binary.byteOffset + binary.byteLength);
        // The OpenAI `Image` type does not expose mime_type. Stick to the
        // requested outputFormat (or png fallback).
        if (ext !== "png" && ext !== "jpeg" && ext !== "webp") ext = "png";
      } else if (item.url) {
        const imageResponse = await fetch(item.url);
        if (!imageResponse.ok) {
          throw new Error(`Failed to download image ${i}: ${imageResponse.statusText}`);
        }
        imageBuffer = await imageResponse.arrayBuffer();
      } else {
        continue;
      }

      const filename = `image_${(typeof prompt === "string" ? prompt : "multimodal").substring(0, 20).replace(/[^a-z0-9]/gi, "_")}_${Date.now()}_${i}.${ext}`;
      const utFile = new UTFile([new Uint8Array(imageBuffer)], filename);

      const uploadResult = await utapi.uploadFiles([utFile]);
      if (!uploadResult[0]?.data?.ufsUrl) {
        throw new Error(`Failed to upload image ${i}`);
      }

      uploadedUrls.push(uploadResult[0].data.ufsUrl);
    }

    return NextResponse.json({ success: true, images: uploadedUrls, count: uploadedUrls.length });
  } catch (error) {
    console.error("Image generation API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate image" },
      { status: 500 },
    );
  }
}