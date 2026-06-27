import { NextRequest } from "next/server";
import {
  validateResponsesParams,
  type ResponsesParams,
} from "@/lib/openai/responses-models";
import { createResponsesSSEStream } from "@/lib/openai/responses-stream";

export const dynamic = "force-dynamic";

/**
 * POST /api/image/responses/stream
 *
 * Server-Sent Events stream wrapping `openai.responses.stream(...)`.
 * Accepts either application/json or multipart/form-data.
 * Forwards user-provided `apiKey` through to the OpenAI client.
 */
export async function POST(req: NextRequest) {
  let raw: unknown;

  const contentType = req.headers.get("content-type") ?? "";
  try {
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const obj: Record<string, unknown> = {};
      for (const [key, value] of form.entries()) {
        if (typeof value === "string") {
          obj[key] = value;
        }
      }
      raw = obj;
    } else {
      raw = await req.json();
    }
  } catch {
    return new Response(
      `event: error\ndata: ${JSON.stringify({ error: "Invalid request body" })}\n\nevent: done\ndata: {}\n\n`,
      {
        status: 400,
        headers: {
          "content-type": "text/event-stream",
          "cache-control": "no-cache, no-transform",
          connection: "keep-alive",
        },
      },
    );
  }

  const validated = validateResponsesParams(raw);
  if (!validated.ok) {
    return new Response(
      `event: error\ndata: ${JSON.stringify({ error: validated.error })}\n\nevent: done\ndata: {}\n\n`,
      {
        status: 400,
        headers: {
          "content-type": "text/event-stream",
          "cache-control": "no-cache, no-transform",
          connection: "keep-alive",
        },
      },
    );
  }

  const params: ResponsesParams = validated.data;
  const stream = createResponsesSSEStream(params);

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
}