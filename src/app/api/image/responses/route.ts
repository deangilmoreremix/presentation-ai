import { type NextRequest, NextResponse } from "next/server"
import { csrfGuard } from "@/lib/csrf";
import { getOpenAIClient } from "@/lib/openai/client";
import { utapi } from "@/app/api/uploadthing/core";
import { UTFile } from "uploadthing/server";
import {
  OPENAI_IMAGE_MODEL,
  OPENAI_RESPONSES_MODEL,
} from "@/constants/image-models";
import {
  type GptImageSize,
  type ImageQuality,
  type OutputFormat,
  type ImageBackground,
  type ImageAction,
  type ImageGenerationMode,
} from "@/lib/image/types";
import { GPT_IMAGE_SIZES, IMAGE_QUALITIES, IMAGE_BACKGROUNDS, OUTPUT_FORMATS, parseCustomImageSize, isValidGptImageSize } from "@/constants/image-models";

const ALLOWED_SIZES: GptImageSize[] = GPT_IMAGE_SIZES;
const ALLOWED_QUALITIES: ImageQuality[] = IMAGE_QUALITIES;
const ALLOWED_FORMATS: OutputFormat[] = OUTPUT_FORMATS;
const ALLOWED_BACKGROUNDS: ImageBackground[] = IMAGE_BACKGROUNDS;
const ALLOWED_MODES: ImageGenerationMode[] = ["generate", "edit", "edit-mask", "style-transfer", "object-removal", "background-removal"];

export async function POST(req: NextRequest) {
  try {
    const csrfError = csrfGuard(req);
    if (csrfError) return csrfError;
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
      mode,
      moderation,
      userId,
      partialImages,
      inputFidelity,
      referenceImages,
      mask,
      stream = false,
    }: {
      input: string;
      model?: string;
      imageModel?: string;
      size?: GptImageSize | string;
      quality?: ImageQuality;
      outputFormat?: OutputFormat;
      outputCompression?: number;
      background?: ImageBackground;
      action?: ImageAction;
      previousResponseId?: string;
      n?: number;
      apiKey?: string;
      mode?: ImageGenerationMode;
      moderation?: "low" | "auto";
      userId?: string;
      partialImages?: number;
      inputFidelity?: "high" | "low";
      referenceImages?: Array<{ url: string; role?: string }>;
      mask?: { url?: string; base64?: string; x?: number; y?: number; width?: number; height?: number };
      stream?: boolean;
    } = body;

    if (!input) {
      return NextResponse.json({ error: "Input is required" }, { status: 400 });
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

    if (!ALLOWED_QUALITIES.includes(quality)) {
      return NextResponse.json({ error: `Invalid quality. Allowed: ${ALLOWED_QUALITIES.join(", ")}` }, { status: 400 });
    }

    if (!ALLOWED_FORMATS.includes(outputFormat)) {
      return NextResponse.json({ error: `Invalid output format. Allowed: ${ALLOWED_FORMATS.join(", ")}` }, { status: 400 });
    }

    if (!ALLOWED_BACKGROUNDS.includes(background)) {
      return NextResponse.json({ error: `Invalid background. Allowed: ${ALLOWED_BACKGROUNDS.join(", ")}` }, { status: 400 });
    }

    const resolvedAction = (mode || action) as ImageAction;

    if (!ALLOWED_MODES.includes(mode as ImageGenerationMode)) {
      return NextResponse.json({ error: `Invalid mode. Allowed: ${ALLOWED_MODES.join(", ")}` }, { status: 400 });
    }

    // Warn for experimental sizes
    if (normalizedSize !== "auto") {
      const [w, h] = (normalizedSize as string).split("x").map(Number);
      if (w && h && w * h > 3686400) {
        console.warn(`Experimental size requested: ${normalizedSize}. Outputs > 2560x1440 are experimental.`);
      }
    }

    const openai = await getOpenAIClient(apiKey);

    // The SDK types predate gpt-image-2; the runtime API accepts these fields.
    const tools: any[] = [
      {
        type: "image_generation",
        model: imageModel,
        size: normalizedSize,
        quality,
        output_format: outputFormat,
        background,
        action: resolvedAction,
        ...(outputCompression !== undefined ? { output_compression: outputCompression } : {}),
        ...(previousResponseId ? { previous_response_id: previousResponseId } : {}),
        ...(inputFidelity ? { input_fidelity: inputFidelity } : {}),
        ...(stream && partialImages ? { partial_images: partialImages } : {}),
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
      model,
      input,
      previous_response_id: previousResponseId,
      tools,
      ...(moderation ? { moderation } : {}),
      ...(userId ? { user: userId } : {}),
      ...(stream ? { stream: true } : {}),
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
