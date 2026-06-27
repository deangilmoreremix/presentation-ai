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
  InputFidelity,
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
const ALLOWED_FIDELITY: InputFidelity[] = ["low", "high", "auto"];
const ALLOWED_MODERATION: ImageModeration[] = ["low", "auto"];
const ALLOWED_RESPONSE_FORMATS: ImageResponseFormat[] = ["url", "b64_json"];

const MAX_INPUT_IMAGES = 10;

function parseFormValue<T extends string>(v: FormDataEntryValue | null): T | undefined {
  if (typeof v !== "string") return undefined;
  return v as T;
}

/**
 * Convert a base64 string (with optional data URL prefix) into a File.
 * Used for the `mask` field which in v2 may be supplied as a base64 RGBA image.
 */
function base64ToFile(input: string, fallbackName: string, fallbackType: string): File {
  const match = /^data:([^;]+);base64,(.*)$/i.exec(input);
  const mime = match?.[1] || fallbackType;
  const data = match ? match[2]! : input;
  const buffer = Buffer.from(data, "base64");
  const arrayBuffer = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  );
  return new File([arrayBuffer], fallbackName, { type: mime });
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    // Prompt: support either a plain string or a JSON-encoded multimodal array
    const promptRaw = formData.get("prompt");
    let prompt: ImagePrompt;
    if (typeof promptRaw !== "string") {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }
    const promptArrayField = formData.get("promptArray");
    if (typeof promptArrayField === "string" && promptArrayField.length > 0) {
      try {
        const parsed = JSON.parse(promptArrayField);
        if (Array.isArray(parsed)) {
          prompt = parsed;
        } else {
          prompt = promptRaw;
        }
      } catch {
        prompt = promptRaw;
      }
    } else {
      prompt = promptRaw;
    }

    if (
      (typeof prompt === "string" && prompt.trim() === "") ||
      (Array.isArray(prompt) && prompt.length === 0)
    ) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const model = (parseFormValue<ImageModel>(formData.get("model")) || "gpt-image-1") as ImageModel;
    const size = (parseFormValue<GptImageSize>(formData.get("size")) || "1024x1024") as GptImageSize;
    const quality = parseFormValue<ImageQuality>(formData.get("quality"));
    const outputFormat = parseFormValue<OutputFormat>(formData.get("outputFormat"));
    const outputCompressionRaw = formData.get("outputCompression");
    const outputCompression =
      typeof outputCompressionRaw === "string" && outputCompressionRaw !== ""
        ? Number(outputCompressionRaw)
        : undefined;
    const n = Number(formData.get("n")) || 1;
    const apiKey = parseFormValue<string>(formData.get("apiKey"));
    const inputFidelity = parseFormValue<InputFidelity>(formData.get("inputFidelity"));
    const moderation = parseFormValue<ImageModeration>(formData.get("moderation"));
    const user = parseFormValue<string>(formData.get("user"));
    const responseFormat =
      (parseFormValue<ImageResponseFormat>(formData.get("responseFormat")) || "url") as ImageResponseFormat;
    const stream = parseFormValue<string>(formData.get("stream")) === "true";

    // Primary input image (required)
    const imageFile = formData.get("image") as File | null;

    // Additional input images: image2..image10 (up to 10 total)
    const additionalFiles: File[] = [];
    for (let i = 2; i <= MAX_INPUT_IMAGES; i++) {
      const f = formData.get(`image${i}`);
      if (f instanceof File) additionalFiles.push(f);
    }

    if (!imageFile) {
      return NextResponse.json({ error: "Image file is required" }, { status: 400 });
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
    if (inputFidelity !== undefined && !ALLOWED_FIDELITY.includes(inputFidelity)) {
      return NextResponse.json(
        { error: `Invalid inputFidelity. Allowed: ${ALLOWED_FIDELITY.join(", ")}` },
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

    if (inputFidelity && !model.startsWith("gpt-image")) {
      return NextResponse.json(
        { error: "input_fidelity is only supported for gpt-image-* models" },
        { status: 400 },
      );
    }

    if (stream) {
      return NextResponse.json(
        {
          error:
            "stream=true is not supported on this endpoint. Use POST /api/image/edit/stream instead.",
        },
        { status: 400 },
      );
    }

    // Mask: accept File or base64 string. v2 uses RGBA in the alpha channel.
    let maskFile: File | null = null;
    const maskRaw = formData.get("mask");
    if (maskRaw instanceof File) {
      maskFile = maskRaw;
    } else if (typeof maskRaw === "string" && maskRaw.length > 0) {
      maskFile = base64ToFile(maskRaw, "mask.png", "image/png");
    }

    const openai = await getOpenAIClient(undefined, apiKey);

    const allInputFiles: File[] = [imageFile, ...additionalFiles];

    const requestParams: OpenAI.ImageEditParamsNonStreaming = {
      model,
      image: allInputFiles,
      prompt: typeof prompt === "string" ? prompt : JSON.stringify(prompt),
      n,
      size,
      response_format: responseFormat,
    };

    if (maskFile) {
      requestParams.mask = maskFile;
    }

    if (model.startsWith("gpt-image")) {
      if (quality) requestParams.quality = quality;
      if (outputFormat) requestParams.output_format = outputFormat;
      if (outputCompression !== undefined) requestParams.output_compression = outputCompression;
      // SDK input_fidelity only accepts 'low' | 'high' | null
      if (inputFidelity && inputFidelity !== "auto") {
        requestParams.input_fidelity = inputFidelity;
      }
      if (user) requestParams.user = user;
    }

    const response = await openai.images.edit(requestParams);

    if (!response.data || response.data.length === 0) {
      throw new Error("Failed to edit image: no data returned");
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
        if (ext !== "png" && ext !== "jpeg" && ext !== "webp") ext = "png";
      } else if (item.url) {
        const imageResponse = await fetch(item.url);
        if (!imageResponse.ok) {
          throw new Error(`Failed to download edited image ${i}: ${imageResponse.statusText}`);
        }
        imageBuffer = await imageResponse.arrayBuffer();
      } else {
        continue;
      }

      const filename = `edited_${(typeof prompt === "string" ? prompt : "multimodal").substring(0, 20).replace(/[^a-z0-9]/gi, "_")}_${Date.now()}_${i}.${ext}`;
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