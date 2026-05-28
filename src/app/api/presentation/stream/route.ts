import { createLogger } from "@/lib/observability/logger";
import { logger } from "@/lib/observability/server/logger";
import { auth } from "@/server/auth";
import { getResponsesClient } from "@/lib/modelPicker";
import { NextResponse } from "next/server";
import OpenAI from "openai";

interface StreamRequest {
  prompt: string;
  previous_response_id?: string;
  presentationId?: string;
  instructions?: string;
  model?: string;
}

const routeLogger = createLogger("api:presentation-stream");

export async function POST(req: Request) {
  try {
    const session = await auth();
    const { prompt, previous_response_id, presentationId, instructions, model = "gpt-4o-mini" } = (await req.json()) as StreamRequest;

    if (!prompt) {
      return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const client = await getResponsesClient(session?.user?.id);

          const response = await client.responses.create({
            model,
            input: prompt,
            instructions: instructions || "You are an expert presentation designer. Generate engaging, well-structured content.",
            previous_response_id,
            tools: [
              { type: "web_search" as const },
              { type: "image_generation" as const },
            ],
            stream: true,
          });

          for await (const event of response) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: event.type, data: event })}\n\n`));
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
        } catch (error) {
          routeLogger.error("Streaming error", error);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "error", error: "Streaming failed" })}\n\n`,
            ),
          );
        } finally {
          controller.close();
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    routeLogger.error("Stream endpoint error", error);
    return NextResponse.json(
      { error: "Failed to start streaming" },
      { status: 500 },
    );
  }
}