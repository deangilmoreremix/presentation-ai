import { NextRequest, NextResponse } from "next/server";
import { getOpenAIClient } from "@/lib/openai/client";
import { utapi } from "@/app/api/uploadthing/core";
import { UTFile } from "uploadthing/server";
import {
  OPENAI_IMAGE_MODEL,
  OPENAI_RESPONSES_MODEL,
} from "@/constants/image-models";
import type {
  GptImageSize,
  ImageQuality,
  OutputFormat,
  ImageBackground,
  ImageAction,
} from "@/lib/image/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      input,
      model = OPENAI_RESPONSES_MODEL,
      imageModel = OPENAI_IMAGE_MODEL,
      size = "1024x1024",
      quality = "auto",
      outputFormat = "png",
      outputCompression,
      background = "opaque",
      action = "auto",
      previousResponseId,
      n = 1,
      apiKey,
    }: {
      input: string;
      model?: string;
      imageModel?: string;
      size?: GptImageSize;
      quality?: ImageQuality;
      outputFormat?: OutputFormat;
      outputCompression?: number;
      background?: ImageBackground;
      action?: ImageAction;
      previousResponseId?: string;
      n?: number;
      apiKey?: string;
    } = body;

    if (!input) {
      return NextResponse.json({ error: "Input is required" }, { status: 400 });
    }

    const openai = await getOpenAIClient(undefined, apiKey);

    // The SDK types predate gpt-image-2; the runtime API accepts these fields.
    const response = await openai.responses.create({
      model,
      input,
      previous_response_id: previousResponseId,
      tools: [
        {
          type: "image_generation",
          model: imageModel,
          size,
          quality,
          output_format: outputFormat,
          background,
          action,
          ...(outputCompression !== undefined
            ? { output_compression: outputCompression }
            : {}),
        } as any,
      ],
    } as any);

    // The image_generation_call output returns base64 in `result`.
    const imageCalls: any[] = (response.output ?? []).filter(
      (item: any) => item.type === "image_generation_call",
    );

    if (imageCalls.length === 0) {
      throw new Error("No images generated from Responses API");
    }

    const uploadedUrls: string[] = [];

    for (let i = 0; i < Math.min(imageCalls.length, n); i++) {
      const base64 = imageCalls[i]?.result;
      if (!base64) {
        throw new Error(`Failed to extract response image ${i}`);
      }

      const imageBuffer = Buffer.from(base64, "base64");
      const filename = `response_${input.substring(0, 20).replace(/[^a-z0-9]/gi, "_")}_${Date.now()}_${i}.${outputFormat}`;
      const utFile = new UTFile([new Uint8Array(imageBuffer)], filename);

      const uploadResult = await utapi.uploadFiles([utFile]);
      if (!uploadResult[0]?.data?.ufsUrl) {
        throw new Error(`Failed to upload response image ${i}`);
      }

      uploadedUrls.push(uploadResult[0].data.ufsUrl);
    }

    return NextResponse.json({
      success: true,
      images: uploadedUrls,
      count: uploadedUrls.length,
      responseId: response.id,
    });
  } catch (error) {
    console.error("Responses API image error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate with Responses API" },
      { status: 500 },
    );
  }
}