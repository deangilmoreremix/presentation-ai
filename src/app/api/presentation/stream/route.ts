import { createLogger } from "@/lib/observability/logger";
import { logger } from "@/lib/observability/server/logger";
import { auth } from "@/server/auth";
import { createResponsesClient } from "@/lib/openai/responses";
import { NextResponse } from "next/server";

interface StreamRequest {
  prompt: string;
  previousResponseId?: string | null;
  modelId?: string;
  modelProvider?: "openai-responses";
}

const STREAM_SYSTEM_PROMPT = `You are an expert presentation generator. Create content based on the user's request and stream it back in real-time.

For outline generation:
- Generate exactly the requested number of topics
- Include 2-3 bullet points per topic
- Use the specified language

For slide generation:
- Generate XML slide structure
- Include layout tags and image queries
- Stream content incrementally

Always yield events with type "text.delta" for incremental content and "response.completed" when finished.`;

export async function POST(req: Request) {
  const actionName = "presentation.stream.post";
  const requestId = crypto.randomUUID();
  const routeLogger = createLogger("api:presentation-stream");
  const span = logger.startSpan(`allweone.api.${actionName}`, {
    attributes: {
      "allweone.scope": "api",
      "allweone.action.type": "api_route",
      "allweone.action.name": actionName,
      "http.method": "POST",
      "http.route": "/api/presentation/stream",
      "allweone.request.id": requestId,
    },
  });

  try {
    routeLogger.info("Stream request received", { requestId });
    const session = await auth();
    if (!session) {
      routeLogger.warn("Stream request rejected: unauthorized", { requestId });
      span.event("allweone.api.request_rejected", {
        "allweone.validation.error": "unauthorized",
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      prompt,
      previousResponseId,
      modelId = "gpt-4o-mini",
    } = (await req.json()) as StreamRequest;

    if (!prompt) {
      return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
    }

    routeLogger.info("Starting Responses API stream", {
      requestId,
      modelId,
      hasPreviousResponse: !!previousResponseId,
    });

    const client = await createResponsesClient(session!.user.id);

    const stream = await client.responses.create({
      model: modelId,
      input: prompt,
      tools: [{ type: "web_search" as const }, { type: "image_generation" as const }],
      store: true,
      previous_response_id: previousResponseId,
      stream: true,
      instructions: STREAM_SYSTEM_PROMPT,
    });

    const encoder = new TextEncoder();
    const sseStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            const eventData = JSON.stringify({
              type: event.type,
              data: event,
            });

            controller.enqueue(encoder.encode(`data: ${eventData}\n\n`));
          }
          controller.close();
        } catch (error) {
          routeLogger.error("Stream error", error, { requestId });
          controller.error(error);
        }
      },
    });

    routeLogger.info("SSE stream created", { requestId });
    return new NextResponse(sseStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    routeLogger.error("Stream failed", error, { requestId });
    span.error(error);
    return NextResponse.json({ error: "Stream failed" }, { status: 500 });
  } finally {
    span.end();
  }
}