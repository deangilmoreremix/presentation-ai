import { env } from "@/env";
import { getOpenAIClient, resolveUserApiKey } from "./client";
import type { ResponseStreamEvent } from "openai";

export interface ResponseChain {
  id: string;
  previousId?: string | null;
  model: string;
  toolCalls: Array<{
    id: string;
    type: string;
    name?: string;
    arguments?: string;
    output?: string;
  }>;
  content: unknown;
  createdAt: Date;
}

export type ResponsesApiTool =
  | { type: "web_search" | "image_generation" | "code_interpreter" }
  | {
      type: "function";
      name: string;
      description: string;
      parameters: Record<string, unknown>;
      strict?: boolean;
    };

export interface ResponsesApiRequest {
  model?: string;
  input: string | Array<{ role: "user" | "assistant"; content: string }>;
  tools?: ResponsesApiTool[];
  tool_choice?: "auto" | "required" | "none";
  temperature?: number;
  max_output_tokens?: number;
  instructions?: string;
  store?: boolean;
  previous_response_id?: string | null;
  stream?: boolean;
  text?: {
    format?: {
      type: "text" | "json_object";
    };
  };
}

export interface ResponsesApiResponse {
  id: string;
  object: "response";
  created_at: number;
  status: "completed" | "in_progress" | "failed";
  model: string;
  output: Array<{
    type: "message" | "tool_call" | "tool_call_output";
    id?: string;
    status?: "completed" | "in_progress";
    content?: Array<{
      type: "text" | "image" | "input_image";
      text?: string;
      image?: { url?: string; detail?: string };
    }>;
    name?: string;
    arguments?: string;
    call_id?: string;
  }>;
  incomplete_details?: string;
  previous_response_id?: string | null;
  store: boolean;
  usage: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  };
}

export async function createResponsesClient(userId?: string) {
  const apiKey = userId
    ? (await resolveUserApiKey(userId)) || env.OPENAI_API_KEY!
    : env.OPENAI_API_KEY!;

  if (!apiKey) {
    throw new Error("OpenAI API key is required for Responses API");
  }

  const client = new (await import("openai")).default({
    apiKey,
    ...(env.OPENAI_RESPONSES_BASE_URL && { baseURL: env.OPENAI_RESPONSES_BASE_URL }),
  });

  return client;
}

export async function createResponse(
  params: ResponsesApiRequest,
  userId?: string
): Promise<ResponsesApiResponse> {
  const client = await createResponsesClient(userId);

  const response = await client.responses.create({
    model: params.model || "gpt-4o-mini",
    input: params.input,
    tools: params.tools as Parameters<typeof client.responses.create>[0]["tools"],
    tool_choice: params.tool_choice,
    temperature: params.temperature,
    max_output_tokens: params.max_output_tokens || 4096,
    instructions: params.instructions,
    store: params.store ?? false,
    previous_response_id: params.previous_response_id,
    stream: false,
    ...(params.text && { text: params.text }),
  });

  return response as unknown as ResponsesApiResponse;
}

export async function* streamResponse(
  params: ResponsesApiRequest,
  userId?: string
): AsyncGenerator<ResponseStreamEvent> {
  const client = await createResponsesClient(userId);

  const stream = await client.responses.create({
    model: params.model || "gpt-4o-mini",
    input: params.input,
    tools: params.tools as Parameters<typeof client.responses.create>[0]["tools"],
    tool_choice: params.tool_choice,
    temperature: params.temperature,
    max_output_tokens: params.max_output_tokens || 4096,
    instructions: params.instructions,
    store: params.store ?? false,
    previous_response_id: params.previous_response_id,
    stream: true,
    ...(params.text && { text: params.text }),
  });

  yield* stream;
}