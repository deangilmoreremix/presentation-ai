import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { getOpenAIClient } from "@/lib/openai/client";
import { utapi } from "@/app/api/uploadthing/core";
import { UTFile } from "uploadthing/server";
import type {
  ImageModel,
  ImageSize,
  ImageQuality,
  OutputFormat,
} from "@/lib/image/types";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      input,
      model = "gpt-4o-mini",
      imageModel = "gpt-image-1",
      size = "1024x1024",
      quality,
      outputFormat,
      outputCompression,
      previousResponseId,
      n = 1,
      apiKey,
    }: {
      input: string;
      model?: string;
      imageModel?: ImageModel;
      size?: ImageSize;
      quality?: ImageQuality;
      outputFormat?: OutputFormat;
      outputCompression?: number;
      previousResponseId?: string;
      n?: number;
      apiKey?: string;
    } = body;

    if (!input) {
      return NextResponse.json({ error: "Input is required" }, { status: 400 });
    }

    const openai = await getOpenAIClient(session.user.id, apiKey);

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

    for (let i = 0; i < Math.min(images.length, n); i++) {
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
        throw new Error(`Failed to upload response image ${i}`);
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
            compression: outputCompression ?? undefined,
            previousResponseId,
            action: previousResponseId ? "edit" : "generate",
            n,
          },
        }),
      ),
    );

    return NextResponse.json({
      success: true,
      images: dbImages,
      count: dbImages.length,
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