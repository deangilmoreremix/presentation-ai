import { NextRequest, NextResponse } from "next/server";
import { getOpenAIClient } from "@/lib/openai/client";
import { utapi } from "@/app/api/uploadthing/core";
import { UTFile } from "uploadthing/server";
import {
  validateResponsesParams,
  type ResponsesParams,
  type ResponsesTextModel,
} from "@/lib/openai/responses-models";

export const dynamic = "force-dynamic";

/**
 * POST /api/image/responses
 *
 * Full OpenAI Responses API image generation. Accepts a wide range
 * of params (multi-turn input, additional tools, reasoning, etc.)
 * and forwards them to `openai.responses.create`.
 *
 * Returns the full response shape including generated image URLs
 * (uploaded through UploadThing), text outputs, tool calls, usage
 * and metadata.
 */
export async function POST(req: NextRequest) {
  try {
    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 },
      );
    }

    const validated = validateResponsesParams(raw);
    if (!validated.ok) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }

    const params: ResponsesParams = validated.data;

    const openai = await getOpenAIClient(undefined, params.apiKey);

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
      if (params.imageTool.action !== undefined)
        imageTool.action = params.imageTool.action;
    }

    const tools: unknown[] = [imageTool];
    if (params.additionalTools && params.additionalTools.length > 0) {
      tools.push(...params.additionalTools);
    }

    const body: Record<string, unknown> = {
      model: params.model ?? ("gpt-4o" as ResponsesTextModel),
      input: params.input,
      tools,
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
    if (params.max_tool_calls !== undefined)
      body.max_tool_calls = params.max_tool_calls;
    if (params.user !== undefined) body.user = params.user;

    const response = await openai.responses.create(
      body as Parameters<typeof openai.responses.create>[0],
    );
    const resp = response as unknown as {
      id: string;
      output: Array<Record<string, unknown>>;
      usage?: { input_tokens: number; output_tokens: number };
      metadata: Record<string, string> | null;
    };

    const toolCalls: Array<{ type: string; id: string; result: unknown }> = [];
    const imageB64s: string[] = [];
    const textOutputs: string[] = [];

    const output = (resp.output ?? []) as Array<Record<string, unknown>>;
    for (const item of output) {
      if (item.type === "image_generation_call") {
        toolCalls.push({
          type: "image_generation_call",
          id: typeof item.id === "string" ? item.id : "",
          result: item.result ?? null,
        });
        if (typeof item.result === "string" && item.result.length > 0) {
          imageB64s.push(item.result);
        }
      } else if (item.type === "message") {
        const content = item.content;
        if (Array.isArray(content)) {
          for (const part of content as Array<Record<string, unknown>>) {
            if (
              (part.type === "output_text" || part.type === "input_text") &&
              typeof part.text === "string"
            ) {
              textOutputs.push(part.text);
            }
          }
        }
        toolCalls.push({
          type: "message",
          id: typeof item.id === "string" ? item.id : "",
          result: item.content ?? null,
        });
      } else {
        toolCalls.push({
          type: typeof item.type === "string" ? item.type : "unknown",
          id: typeof item.id === "string" ? item.id : "",
          result: item,
        });
      }
    }

    if (imageB64s.length === 0) {
      return NextResponse.json(
        { error: "No images generated from Responses API" },
        { status: 500 },
      );
    }

    const uploadedUrls: string[] = [];
    const fmt = params.imageTool?.output_format ?? "png";
    const baseLabel = typeof params.input === "string"
      ? params.input.substring(0, 20).replace(/[^a-z0-9]/gi, "_")
      : "multi_turn";

    for (let i = 0; i < imageB64s.length; i++) {
      const b64 = imageB64s[i];
      if (!b64) continue;
      const buffer = Buffer.from(b64, "base64");
      const filename = `response_${baseLabel}_${Date.now()}_${i}.${fmt}`;
      const utFile = new UTFile([new Uint8Array(buffer)], filename);

      const uploadResult = await utapi.uploadFiles([utFile]);
      if (!uploadResult[0]?.data?.ufsUrl) {
        throw new Error(`Failed to upload response image ${i}`);
      }
      uploadedUrls.push(uploadResult[0].data.ufsUrl);
    }

    const usage = resp.usage;
    return NextResponse.json({
      success: true,
      responseId: resp.id,
      images: uploadedUrls,
      textOutputs,
      toolCalls,
      usage: usage
        ? {
            input_tokens: usage.input_tokens,
            output_tokens: usage.output_tokens,
            total_tokens: usage.input_tokens + usage.output_tokens,
          }
        : null,
      metadata: resp.metadata ?? null,
    });
  } catch (error) {
    console.error("Responses API image error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to generate with Responses API",
      },
      { status: 500 },
    );
  }
}