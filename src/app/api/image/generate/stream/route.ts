import { NextRequest } from "next/server";
import { createImageSSEStream } from "@/lib/openai/image-stream";
import type {
  ImageModel,
  GptImageSize,
  ImageQuality,
  OutputFormat,
  ImageBackground,
  ImageModeration,
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

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

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
    partialImages,
  } = body as {
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
    partialImages?: number;
  };

  if (prompt === undefined || prompt === null) {
    return jsonError("Prompt is required", 400);
  }
  if (typeof prompt === "string" && prompt.trim() === "") {
    return jsonError("Prompt is required", 400);
  }
  if (Array.isArray(prompt) && prompt.length === 0) {
    return jsonError("Prompt is required", 400);
  }

  if (!ALLOWED_MODELS.includes(model)) {
    return jsonError(`Invalid model. Allowed: ${ALLOWED_MODELS.join(", ")}`, 400);
  }
  if (!ALLOWED_SIZES.includes(size)) {
    return jsonError(`Invalid size. Allowed: ${ALLOWED_SIZES.join(", ")}`, 400);
  }
  if (quality !== undefined && !ALLOWED_QUALITIES.includes(quality)) {
    return jsonError(`Invalid quality. Allowed: ${ALLOWED_QUALITIES.join(", ")}`, 400);
  }
  if (outputFormat !== undefined && !ALLOWED_FORMATS.includes(outputFormat)) {
    return jsonError(`Invalid outputFormat. Allowed: ${ALLOWED_FORMATS.join(", ")}`, 400);
  }
  if (moderation !== undefined && !ALLOWED_MODERATION.includes(moderation)) {
    return jsonError(`Invalid moderation. Allowed: ${ALLOWED_MODERATION.join(", ")}`, 400);
  }
  if (inputFidelityPresent(body)) {
    return jsonError("input_fidelity is only supported on the edit endpoint", 400);
  }

  // Streaming is only meaningful for GPT image models.
  if (!String(model).startsWith("gpt-image")) {
    return jsonError(
      "Streaming is only supported for gpt-image-* models (gpt-image-1, gpt-image-1-mini, gpt-image-1.5)",
      400,
    );
  }

  const stream = createImageSSEStream({
    prompt,
    model,
    size,
    quality,
    outputFormat,
    outputCompression,
    background,
    n,
    apiKey,
    moderation,
    user,
    partialImages,
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      "x-accel-buffering": "no",
      connection: "keep-alive",
    },
  });
}

function inputFidelityPresent(b: Record<string, unknown>): boolean {
  return b["inputFidelity"] !== undefined || b["input_fidelity"] !== undefined;
}