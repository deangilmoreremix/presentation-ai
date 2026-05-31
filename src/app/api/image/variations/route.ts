import { NextRequest, NextResponse } from "next/server";
import { getOpenAIClient } from "@/lib/openai/client";
import { utapi } from "@/app/api/uploadthing/core";
import { UTFile } from "uploadthing/server";
import type { ImageModel } from "@/lib/image/types";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const imageFile = formData.get("image") as File | null;
    const model = (formData.get("model") as ImageModel) || "dall-e-2";
    const n = Number(formData.get("n")) || 1;
    const apiKey = formData.get("apiKey") as string | undefined;

    if (!imageFile) {
      return NextResponse.json({ error: "Image file is required" }, { status: 400 });
    }

    const openai = await getOpenAIClient(undefined, apiKey);

    const response = await openai.images.createVariation({
      model,
      image: imageFile,
      n,
      response_format: "url",
    });

    if (!response.data || response.data.length === 0) {
      throw new Error("Failed to create variation: no data returned");
    }

    const uploadedUrls: string[] = [];

    for (let i = 0; i < response.data.length; i++) {
      const imageUrl = response.data[i]?.url;
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
        throw new Error(`Failed to upload variation ${i}`);
      }

      uploadedUrls.push(uploadResult[0].data.ufsUrl);
    }

    return NextResponse.json({ success: true, images: uploadedUrls, count: uploadedUrls.length });
  } catch (error) {
    console.error("Image variation API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create variation" },
      { status: 500 },
    );
  }
}