import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { getOpenAIClient } from "@/lib/openai/client";
import { utapi } from "@/app/api/uploadthing/core";
import { UTFile } from "uploadthing/server";
import type {
  ImageModel,
  GptImageSize,
  ImageQuality,
  OutputFormat,
  ImageBackground,
} from "@/lib/image/types";

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

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
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
    }: {
      prompt: string;
      model?: ImageModel;
      size?: GptImageSize;
      quality?: ImageQuality;
      outputFormat?: OutputFormat;
      outputCompression?: number;
      background?: ImageBackground;
      n?: number;
      apiKey?: string;
    } = body;

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    if (!ALLOWED_MODELS.includes(model)) {
      return NextResponse.json({ error: `Invalid model. Allowed: ${ALLOWED_MODELS.join(", ")}` }, { status: 400 });
    }

    if (!ALLOWED_SIZES.includes(size)) {
      return NextResponse.json({ error: `Invalid size. Allowed: ${ALLOWED_SIZES.join(", ")}` }, { status: 400 });
    }

    const openai = await getOpenAIClient(session.user.id, apiKey);

    const requestParams: OpenAI.ImageGenerateParams = {
      model,
      prompt,
      n,
      size,
      response_format: "url",
    };

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

    const uploadedUrls: string[] = [];

    for (let i = 0; i < response.data.length; i++) {
      const imageUrl = response.data[i]?.url;
      if (!imageUrl) continue;

      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error(`Failed to download image ${i}: ${imageResponse.statusText}`);
      }

      const imageBlob = await imageResponse.blob();
      const imageBuffer = await imageBlob.arrayBuffer();
      const filename = `image_${prompt.substring(0, 20).replace(/[^a-z0-9]/gi, "_")}_${Date.now()}_${i}.${outputFormat || "png"}`;
      const utFile = new UTFile([new Uint8Array(imageBuffer)], filename);

      const uploadResult = await utapi.uploadFiles([utFile]);
      if (!uploadResult[0]?.data?.ufsUrl) {
        throw new Error(`Failed to upload image ${i}`);
      }

      uploadedUrls.push(uploadResult[0].data.ufsUrl);
    }

    const images = await Promise.all(
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

    return NextResponse.json({ success: true, images, count: images.length });
  } catch (error) {
    console.error("Image generation API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate image" },
      { status: 500 },
    );
  }
}