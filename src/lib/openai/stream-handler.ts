import type { ResponsesApiResponse } from "./responses";

export type StreamEventType = 
  | "response.created"
  | "response.in_progress"
  | "response.completed"
  | "response.failed"
  | "tool_call"
  | "tool_call_output"
  | "text.delta"
  | "text.done";

export interface StreamEvent {
  type: StreamEventType;
  data: {
    responseId?: string;
    content?: string;
    toolCall?: {
      id: string;
      name: string;
      arguments?: string;
    };
    toolOutput?: {
      callId: string;
      output: string;
    };
  };
}

export function formatSseEvent(event: StreamEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export function createStreamResponse(
  generator: AsyncGenerator<ResponsesApiResponse | { type: "stream_event"; event: string; data: unknown }>,
): ReadableStream {
  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of generator) {
          controller.enqueue(
            new TextEncoder().encode(formatSseEvent(chunk as unknown as StreamEvent)),
          );
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });
}