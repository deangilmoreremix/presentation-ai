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
  ImagePrompt,
} from "@/lib/image/types";

/**
 * SSE event names emitted by the streaming image endpoints.
 */
export const SSE_EVENTS = {
  PARTIAL: "image.partial",
  COMPLETED: "image.completed",
  DONE: "done",
  ERROR: "error",
} as const;

export interface CreateImageSSEStreamParams {
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
  /**
   * When true, every partial and completed b64 image is also uploaded to
   * UploadThing and a URL is included in the event payload.
   */
  uploadToUt?: boolean;
}

interface PartialPayload {
  index: number;
  b64_json: string;
  completed_at?: number;
  url?: string;
  output_format?: string;
}

interface CompletedPayload {
  urls: string[];
  images: Array<{ index: number; b64_json: string; url?: string; output_format?: string }>;
}

function sseFrame(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function encoder(): TextEncoder {
  return new TextEncoder();
}

async function uploadB64(b64: string, ext: string, namePrefix: string, idx: number): Promise<string> {
  const binary = Buffer.from(b64, "base64");
  const buffer = binary.buffer.slice(
    binary.byteOffset,
    binary.byteOffset + binary.byteLength,
  );
  const filename = `${namePrefix}_${Date.now()}_${idx}.${ext}`;
  const utFile = new UTFile([new Uint8Array(buffer)], filename);
  const result = await utapi.uploadFiles([utFile]);
  const url = result[0]?.data?.ufsUrl;
  if (!url) throw new Error(`Failed to upload image ${idx}`);
  return url;
}

/**
 * Wraps the OpenAI streaming images call and returns a `ReadableStream<Uint8Array>`
 * suitable for Next.js Response bodies (SSE).
 *
 * Emits the following events:
 *   event: image.partial  -> { index, b64_json, completed_at?, url?, output_format? }
 *   event: image.completed -> { urls, images }
 *   event: done            -> {}
 *   event: error           -> { message }
 */
export function createImageSSEStream(
  params: CreateImageSSEStreamParams,
): ReadableStream<Uint8Array> {
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
    uploadToUt = true,
  } = params;

  const enc = encoder();
  const ext = outputFormat || "png";

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const write = (event: string, data: unknown) => {
        controller.enqueue(enc.encode(sseFrame(event, data)));
      };

      try {
        const openai = await getOpenAIClient(undefined, apiKey);

        const requestParams: OpenAI.ImageGenerateParamsStreaming = {
          model,
          prompt: typeof prompt === "string" ? prompt : JSON.stringify(prompt),
          n,
          size,
          stream: true,
          partial_images: partialImages ?? 2,
        };

        if (model.startsWith("gpt-image")) {
          if (quality) requestParams.quality = quality;
          if (outputFormat) requestParams.output_format = outputFormat;
          if (outputCompression !== undefined)
            requestParams.output_compression = outputCompression;
          if (background) requestParams.background = background;
          if (moderation) requestParams.moderation = moderation;
          if (user) requestParams.user = user;
        }

        const stream = (await openai.images.generate(requestParams)) as unknown as {
          [Symbol.asyncIterator](): AsyncIterator<OpenAI.ImageGenStreamEvent>;
        };

        const finalByIndex: Map<number, string> = new Map();
        const finalFormatByIndex: Map<number, string> = new Map();

        for await (const event of stream) {
          if (event.type === "image_generation.partial_image") {
            const idx = event.partial_image_index;
            let url: string | undefined;
            if (uploadToUt) {
              try {
                url = await uploadB64(event.b64_json, ext, "image_partial", idx);
              } catch (e) {
                console.error("Partial image upload failed:", e);
              }
            }
            const payload: PartialPayload = {
              index: idx,
              b64_json: event.b64_json,
              completed_at: event.created_at,
              output_format: event.output_format,
              ...(url ? { url } : {}),
            };
            write(SSE_EVENTS.PARTIAL, payload);
          } else if (event.type === "image_generation.completed") {
            const idx = (event as unknown as { partial_image_index?: number })
              .partial_image_index ?? 0;
            finalByIndex.set(idx, event.b64_json);
            finalFormatByIndex.set(idx, event.output_format);

            let url: string | undefined;
            if (uploadToUt) {
              try {
                const fmt = event.output_format || ext;
                url = await uploadB64(event.b64_json, fmt, "image_final", idx);
              } catch (e) {
                console.error("Completed image upload failed:", e);
              }
            }
            if (url) {
              // Replace the partial upload with the final URL if available.
              finalByIndex.set(idx, event.b64_json);
            }
            const images: CompletedPayload["images"] = [];
            const sortedIndexes = [...finalByIndex.keys()].sort((a, b) => a - b);
            for (const i of sortedIndexes) {
              const b64 = finalByIndex.get(i)!;
              const fmt = finalFormatByIndex.get(i) || ext;
              let u: string | undefined;
              if (uploadToUt) {
                try {
                  u = await uploadB64(b64, fmt, "image_final", i);
                } catch {
                  /* ignore */
                }
              }
              images.push({ index: i, b64_json: b64, output_format: fmt, ...(u ? { url: u } : {}) });
            }
            const urls = images.map((img) => img.url).filter((u): u is string => Boolean(u));
            const completed: CompletedPayload = { urls, images };
            write(SSE_EVENTS.COMPLETED, completed);
          }
        }

        write(SSE_EVENTS.DONE, {});
        controller.close();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to generate image";
        console.error("Image SSE stream error:", error);
        controller.enqueue(enc.encode(sseFrame(SSE_EVENTS.ERROR, { message })));
        controller.close();
      }
    },
  });
}