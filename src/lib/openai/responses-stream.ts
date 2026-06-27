import OpenAI from "openai";
import { getOpenAIClient } from "@/lib/openai/client";
import {
  validateResponsesParams,
  type ResponsesParams,
} from "@/lib/openai/responses-models";
import type { ResponseStreamEvent } from "openai/resources/responses/responses";

const encoder = new TextEncoder();

function sse(event: string, data: unknown): Uint8Array {
  const payload =
    `event: ${event}\n` +
    `data: ${JSON.stringify(data)}\n\n`;
  return encoder.encode(payload);
}

/**
 * Convert validated ResponsesParams to the shape expected by
 * `openai.responses.stream(...)`.
 */
function buildOpenAIParams(params: ResponsesParams) {
  const imageTool: Record<string, unknown> = { type: "image_generation" };
  if (params.imageModel) imageTool.model = params.imageModel;
  if (params.imageTool) {
    if (params.imageTool.size !== undefined) imageTool.size = params.imageTool.size;
    if (params.imageTool.quality !== undefined) imageTool.quality = params.imageTool.quality;
    if (params.imageTool.output_format !== undefined)
      imageTool.output_format = params.imageTool.output_format;
    if (params.imageTool.output_compression !== undefined)
      imageTool.output_compression = params.imageTool.output_compression;
    if (params.imageTool.background !== undefined)
      imageTool.background = params.imageTool.background;
    if (params.imageTool.input_fidelity !== undefined)
      imageTool.input_fidelity = params.imageTool.input_fidelity;
    if (params.imageTool.moderation !== undefined)
      imageTool.moderation = params.imageTool.moderation;
    if (params.imageTool.partial_images !== undefined)
      imageTool.partial_images = params.imageTool.partial_images;
    if (params.imageTool.action !== undefined) imageTool.action = params.imageTool.action;
  }

  const tools: unknown[] = [imageTool];
  if (params.additionalTools && params.additionalTools.length > 0) {
    tools.push(...params.additionalTools);
  }

  const body: Record<string, unknown> = {
    model: params.model ?? "gpt-4o",
    input: params.input,
    tools,
    stream: true,
  };

  if (params.instructions !== undefined) body.instructions = params.instructions;
  if (params.previous_response_id !== undefined)
    body.previous_response_id = params.previous_response_id;
  if (params.metadata !== undefined) body.metadata = params.metadata;
  if (params.parallel_tool_calls !== undefined)
    body.parallel_tool_calls = params.parallel_tool_calls;
  if (params.store !== undefined) body.store = params.store;
  if (params.truncation !== undefined) body.truncation = params.truncation;
  if (params.reasoning !== undefined) body.reasoning = params.reasoning;
  if (params.temperature !== undefined) body.temperature = params.temperature;
  if (params.top_p !== undefined) body.top_p = params.top_p;
  if (params.max_output_tokens !== undefined)
    body.max_output_tokens = params.max_output_tokens;
  if (params.max_tool_calls !== undefined) body.max_tool_calls = params.max_tool_calls;
  if (params.user !== undefined) body.user = params.user;

  return body as Parameters<OpenAI["responses"]["stream"]>[0];
}

/**
 * Wrap an OpenAI Responses stream into an SSE-encoded ReadableStream
 * suitable for Next.js route handlers.
 *
 * Events emitted:
 *   - response.created           { id, model, status }
 *   - response.in_progress       { responseId }
 *   - response.output_item.added { type, ...item fields }
 *   - image.partial              { index, b64_json }  (forwarded from image_generation_call.partial_image)
 *   - image.completed            { urls: [...] }      (emitted at response.completed)
 *   - response.completed         { responseId, usage }
 *   - response.failed            { error }
 *   - done                       {}
 */
export function createResponsesSSEStream(
  params: ResponsesParams,
): ReadableStream<Uint8Array> {
  const validated = validateResponsesParams(params);
  if (!validated.ok) {
    const msg = validated.error;
    return new ReadableStream({
      start(controller) {
        controller.enqueue(sse("error", { error: msg }));
        controller.enqueue(sse("done", {}));
        controller.close();
      },
    });
  }

  const openaiPromise = getOpenAIClient(undefined, validated.data.apiKey);

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const safeEnqueue = (chunk: Uint8Array) => {
        if (closed) return;
        try {
          controller.enqueue(chunk);
        } catch {
          closed = true;
        }
      };
      const safeClose = () => {
        if (closed) return;
        closed = true;
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };
      const safeError = (err: unknown) => {
        if (closed) return;
        try {
          controller.error(err);
          closed = true;
        } catch {
          /* already closed */
        }
      };

      try {
        const openai = await openaiPromise;
        const body = buildOpenAIParams(validated.data);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const stream = (openai.responses as any).stream(body) as {
          [Symbol.asyncIterator]: () => AsyncIterator<ResponseStreamEvent>;
        };

        let responseId: string | undefined;
        const completedImageIds = new Set<string>();

        for await (const event of stream) {
          const type = (event as ResponseStreamEvent).type;

          if (type === "response.created") {
            const e = event as Extract<ResponseStreamEvent, { type: "response.created" }>;
            responseId = e.response.id;
            safeEnqueue(
              sse("response.created", {
                id: e.response.id,
                model: e.response.model,
                status: e.response.status,
              }),
            );
            continue;
          }

          if (type === "response.in_progress") {
            const e = event as Extract<ResponseStreamEvent, { type: "response.in_progress" }>;
            responseId = e.response.id;
            safeEnqueue(
              sse("response.in_progress", { responseId: e.response.id }),
            );
            continue;
          }

          if (type === "response.output_item.added") {
            const e = event as Extract<ResponseStreamEvent, { type: "response.output_item.added" }>;
            const item = e.item as unknown as Record<string, unknown>;
            safeEnqueue(
              sse("response.output_item.added", {
                type: item.type,
                output_index: e.output_index,
                ...item,
              }),
            );
            continue;
          }

          if (type === "response.image_generation_call.partial_image") {
            const e = event as Extract<
              ResponseStreamEvent,
              { type: "response.image_generation_call.partial_image" }
            >;
            safeEnqueue(
              sse("image.partial", {
                index: e.partial_image_index,
                b64_json: e.partial_image_b64,
              }),
            );
            continue;
          }

          if (type === "response.image_generation_call.completed") {
            const e = event as Extract<
              ResponseStreamEvent,
              { type: "response.image_generation_call.completed" }
            >;
            completedImageIds.add(e.item_id);
            continue;
          }

          if (type === "response.completed") {
            const e = event as Extract<ResponseStreamEvent, { type: "response.completed" }>;
            responseId = e.response.id;
            const usage = e.response.usage;
            const imageUrls: string[] = [];
            const textOutputs: string[] = [];
            for (const item of e.response.output) {
              const it = item as unknown as Record<string, unknown>;
              if (it.type === "image_generation_call" && typeof it.result === "string") {
                imageUrls.push(`data:image/png;base64,${it.result}`);
              } else if (it.type === "message" && Array.isArray(it.content)) {
                for (const part of it.content as Array<Record<string, unknown>>) {
                  if (part.type === "output_text" && typeof part.text === "string") {
                    textOutputs.push(part.text);
                  }
                }
              }
            }
            if (imageUrls.length > 0) {
              safeEnqueue(sse("image.completed", { urls: imageUrls }));
            }
            safeEnqueue(
              sse("response.completed", {
                responseId: e.response.id,
                usage: usage
                  ? {
                      input_tokens: usage.input_tokens,
                      output_tokens: usage.output_tokens,
                      total_tokens: usage.input_tokens + usage.output_tokens,
                    }
                  : null,
                textOutputs,
              }),
            );
            safeEnqueue(sse("done", {}));
            safeClose();
            return;
          }

          if (type === "response.failed") {
            const e = event as Extract<ResponseStreamEvent, { type: "response.failed" }>;
            responseId = e.response.id;
            safeEnqueue(
              sse("response.failed", {
                error: e.response.error ?? { message: "Response failed" },
              }),
            );
            safeEnqueue(sse("done", {}));
            safeClose();
            return;
          }

          if (type === "error") {
            const e = event as Extract<ResponseStreamEvent, { type: "error" }>;
            safeEnqueue(sse("error", { error: e.message ?? "Unknown error" }));
          }
        }

        safeEnqueue(sse("done", { responseId }));
        safeClose();
      } catch (err) {
        safeEnqueue(
          sse("error", { error: err instanceof Error ? err.message : "Stream error" }),
        );
        safeEnqueue(sse("done", {}));
        safeClose();
      }
    },
    cancel() {
      /* consumer disconnected; nothing else to clean up */
    },
  });
}