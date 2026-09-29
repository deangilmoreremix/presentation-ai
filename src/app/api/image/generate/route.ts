import { type NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getOpenAIClient } from "@/lib/openai/client";
import { utapi } from "@/app/api/uploadthing/core";
import { UTFile } from "uploadthing/server";
import {
  type ImageModel,
  type GptImageSize,
  type ImageQuality,
  type OutputFormat,
  type ImageBackground,
  type ImageGenerationMode,
} from "@/lib/image/types";
import {
  GPT_IMAGE_SIZES,
  IMAGE_QUALITIES,
  IMAGE_BACKGROUNDS,
  OUTPUT_FORMATS,
  parseCustomImageSize,
  isValidGptImageSize,
} from "@/constants/image-models";

const ALLOWED_MODELS: ImageModel[] = [
  "gpt-image-2.5-sunburst",
  "gpt-image-2.5-flare",
  "gpt-image-2.5",
  "gpt-image-2",
  "gpt-image-1",
  "gpt-image-1-mini",
  "gpt-image-1.5",
  "dall-e-3",
  "dall-e-2",
];

const ALLOWED_SIZES: GptImageSize[] = GPT_IMAGE_SIZES;
const ALLOWED_QUALITIES: ImageQuality[] = IMAGE_QUALITIES;
const ALLOWED_FORMATS: OutputFormat[] = OUTPUT_FORMATS;
const ALLOWED_BACKGROUNDS: ImageBackground[] = IMAGE_BACKGROUNDS;
const ALLOWED_MODES: ImageGenerationMode[] = ["generate", "edit", "edit-mask", "style-transfer", "object-removal", "background-removal"];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      prompt,
      model = "gpt-image-2.5-sunburst",
      size = "1024x1024",
      quality = "auto",
      outputFormat = "png",
      outputCompression,
      background = "opaque",
      n = 1,
      apiKey,
      mode = "generate",
      previousResponseId,
      partialImages,
      moderation,
      userId,
      referenceImages,
      mask,
      stream = false,
      inputFidelity,
    }: {
      prompt: string;
      model?: ImageModel;
      size?: GptImageSize | string;
      quality?: ImageQuality;
      outputFormat?: OutputFormat;
      outputCompression?: number;
      background?: ImageBackground;
      n?: number;
      apiKey?: string;
      mode?: ImageGenerationMode;
      previousResponseId?: string;
      partialImages?: number;
      moderation?: "low" | "auto";
      userId?: string;
      inputFidelity?: "high" | "low";
      referenceImages?: Array<{ url: string; role?: string }>;
      mask?: { url?: string; base64?: string; x?: number; y?: number; width?: number; height?: number };
      stream?: boolean;
    } = body;

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    // Validate model
    const normalizedModel = Array.isArray(model) ? model[0] : model;
    if (!ALLOWED_MODELS.includes(normalizedModel as ImageModel)) {
      return NextResponse.json({ error: `Invalid model. Allowed: ${ALLOWED_MODELS.join(", ")}` }, { status: 400 });
    }

    // Validate/normalize size
    let normalizedSize = size;
    if (size !== "auto" && typeof size === "string" && !isValidGptImageSize(size)) {
      const custom = parseCustomImageSize(size);
      if (!custom) {
        return NextResponse.json({
          error: `Invalid size. Must be one of: ${ALLOWED_SIZES.join(", ")}, or a custom WxH (multiples of 16, max 3840, total pixels 655k-8.2M)`,
          status: 400,
        });
      }
      normalizedSize = custom;
    }

    if (!ALLOWED_SIZES.includes(normalizedSize as GptImageSize)) {
      return NextResponse.json({ error: `Invalid size. Allowed: ${ALLOWED_SIZES.join(", ")}` }, { status: 400 });
    }

    // Validate quality
    if (!ALLOWED_QUALITIES.includes(quality)) {
      return NextResponse.json({ error: `Invalid quality. Allowed: ${ALLOWED_QUALITIES.join(", ")}` }, { status: 400 });
    }

    // Validate format
    if (!ALLOWED_FORMATS.includes(outputFormat)) {
      return NextResponse.json({ error: `Invalid output format. Allowed: ${ALLOWED_FORMATS.join(", ")}` }, { status: 400 });
    }

    // Validate background
    if (!ALLOWED_BACKGROUNDS.includes(background)) {
      return NextResponse.json({ error: `Invalid background. Allowed: ${ALLOWED_BACKGROUNDS.join(", ")}` }, { status: 400 });
    }

    // Validate mode
    if (!ALLOWED_MODES.includes(mode)) {
      return NextResponse.json({ error: `Invalid mode. Allowed: ${ALLOWED_MODES.join(", ")}` }, { status: 400 });
    }

    // Warn for experimental sizes
    if (normalizedSize !== "auto") {
      const [w, h] = (normalizedSize as string).split("x").map(Number);
      if (w && h && w * h > 3686400) {
        console.warn(`Experimental size requested: ${normalizedSize}. Outputs > 2560x1440 are experimental.`);
      }
    }

    const openai = await getOpenAIClient(undefined, apiKey);

    // Streaming is not supported by the SDK path here; return an explicit error if requested.
    if (stream) {
      return NextResponse.json({ error: "Streaming is not supported by this endpoint. Use /api/image/responses for streaming." }, { status: 400 });
    }

    // Determine whether to use Responses API for advanced modes
    const useResponsesApi = mode !== "generate" || previousResponseId || referenceImages || mask;

    if (useResponsesApi) {
      const tools: any[] = [
        {
          type: "image_generation",
          model: normalizedModel,
          size: normalizedSize,
          quality,
          output_format: outputFormat,
          background,
          action: mode === "generate" ? "auto" : mode,
          ...(outputCompression !== undefined ? { output_compression: outputCompression } : {}),
          ...(previousResponseId ? { previous_response_id: previousResponseId } : {}),
          ...(inputFidelity ? { input_fidelity: inputFidelity } : {}),
          ...(stream ? { partial_images: 2 } : {}),
        },
      ];

      if (referenceImages && referenceImages.length > 0) {
        tools[0].input_image = referenceImages.map((ref) => ({
          type: "input_image",
          image_url: ref.url,
          role: ref.role || "other",
        }));
      }

      if (mask) {
        tools[0].mask = mask.url || mask.base64;
        if (mask.x !== undefined) tools[0].mask_x = mask.x;
        if (mask.y !== undefined) tools[0].mask_y = mask.y;
        if (mask.width !== undefined) tools[0].mask_width = mask.width;
        if (mask.height !== undefined) tools[0].mask_height = mask.height;
      }

      const response = await openai.responses.create({
        model: "gpt-5",
        input: mode === "generate" ? `Draw the following image: ${prompt}` : prompt,
        tools: tools as any,
        ...(moderation ? { moderation } : {}),
        ...(userId ? { user: userId } : {}),
        ...(stream ? { stream: true } : {}),
      } as any);

      const imageCalls: any[] = (response.output ?? []).filter((item: any) => item.type === "image_generation_call");

      if (imageCalls.length === 0) {
        throw new Error("No images generated from Responses API");
      }

      const uploadedUrls: string[] = [];

      for (let i = 0; i < Math.min(imageCalls.length, n); i++) {
        const base64 = imageCalls[i]?.result;
        if (!base64) continue;

        const imageBuffer = Buffer.from(base64, "base64");
        const filename = `image_${prompt.substring(0, 20).replace(/[^a-z0-9]/gi, "_")}_${Date.now()}_${i}.${outputFormat}`;
        const utFile = new UTFile([new Uint8Array(imageBuffer)], filename);

        const uploadResult = await utapi.uploadFiles([utFile]);
        if (!uploadResult[0]?.data?.ufsUrl) {
          throw new Error(`Failed to upload image ${i}`);
        }

        uploadedUrls.push(uploadResult[0].data.ufsUrl);
      }

      return NextResponse.json({
        success: true,
        images: uploadedUrls,
        count: uploadedUrls.length,
        responseId: response.id,
        previousResponseId: response.id,
        mode,
        model: normalizedModel,
      });
    }

    // Direct generate path
    const requestParams: Record<string, unknown> = {
      model: normalizedModel,
      prompt,
      n,
      size: normalizedSize,
    };

    if ((normalizedModel as string).startsWith("gpt-image")) {
      if (quality) requestParams.quality = quality;
      if (outputFormat) requestParams.output_format = outputFormat;
      if (outputCompression !== undefined) requestParams.output_compression = outputCompression;
      if (background) requestParams.background = background;
      if (moderation) requestParams.moderation = moderation;
      if (userId) requestParams.user = userId;
      if (stream) requestParams.stream = stream;
      if (partialImages !== undefined) requestParams.partial_images = partialImages;
    } else {
      // DALL-E models support response_format
      requestParams.response_format = "url";
    }

    const response = await openai.images.generate(requestParams as any);

    if (!response.data || response.data.length === 0) {
      throw new Error("Failed to generate image: no data returned");
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
          throw new Error(`Failed to download image ${i}: ${imageResponse.statusText}`);
        }
        const blob = await imageResponse.blob();
        imageBuffer = Buffer.from(await blob.arrayBuffer());
      } else {
        continue;
      }

      const filename = `image_${prompt.substring(0, 20).replace(/[^a-z0-9]/gi, "_")}_${Date.now()}_${i}.${outputFormat}`;
      const utFile = new UTFile([new Uint8Array(imageBuffer)], filename);

      const uploadResult = await utapi.uploadFiles([utFile]);
      if (!uploadResult[0]?.data?.ufsUrl) {
        throw new Error(`Failed to upload image ${i}`);
      }

      uploadedUrls.push(uploadResult[0].data.ufsUrl);
    }

    return NextResponse.json({
      success: true,
      images: uploadedUrls,
      count: uploadedUrls.length,
      mode,
      model: normalizedModel,
    });
  } catch (error) {
    console.error("Image generation API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate image" },
      { status: 500 },
    );
  }
}
