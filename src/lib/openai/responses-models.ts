/**
 * OpenAI Responses API constants and validation.
 *
 * Defines allowed values for the various Responses API params
 * (text models, image models, qualities, formats, backgrounds,
 * input fidelities, moderations) plus a single validator entry
 * point used by both the streaming and non-streaming routes.
 */

export const RESPONSES_TEXT_MODELS = [
  "gpt-4o",
  "gpt-4o-mini",
  "gpt-4.1",
  "gpt-4.1-mini",
  "o3",
  "o4-mini",
] as const;

export type ResponsesTextModel = (typeof RESPONSES_TEXT_MODELS)[number];

export const RESPONSES_IMAGE_MODELS = [
  "gpt-image-1",
  "gpt-image-1-mini",
  "gpt-image-1.5",
] as const;

export type ResponsesImageModel = (typeof RESPONSES_IMAGE_MODELS)[number];

export const RESPONSES_QUALITIES = [
  "low",
  "medium",
  "high",
  "auto",
] as const;
export type ResponsesQuality = (typeof RESPONSES_QUALITIES)[number];

export const RESPONSES_FORMATS = ["png", "jpeg", "webp"] as const;
export type ResponsesFormat = (typeof RESPONSES_FORMATS)[number];

export const RESPONSES_BACKGROUNDS = [
  "transparent",
  "opaque",
  "auto",
] as const;
export type ResponsesBackground = (typeof RESPONSES_BACKGROUNDS)[number];

export const RESPONSES_INPUT_FIDELITIES = ["low", "high", "auto"] as const;
export type ResponsesInputFidelity =
  (typeof RESPONSES_INPUT_FIDELITIES)[number];

export const RESPONSES_MODERATIONS = ["auto", "low"] as const;
export type ResponsesModeration = (typeof RESPONSES_MODERATIONS)[number];

export const RESPONSES_REASONING_EFFORTS = ["low", "medium", "high"] as const;
export type ResponsesReasoningEffort =
  (typeof RESPONSES_REASONING_EFFORTS)[number];

export const RESPONSES_REASONING_SUMMARIES = [
  "auto",
  "concise",
  "detailed",
] as const;
export type ResponsesReasoningSummary =
  (typeof RESPONSES_REASONING_SUMMARIES)[number];

export const RESPONSES_TRUNCATION_MODES = ["auto", "disabled"] as const;
export type ResponsesTruncationMode =
  (typeof RESPONSES_TRUNCATION_MODES)[number];

export interface ResponsesImageToolConfig {
  type: "image_generation";
  model?: ResponsesImageModel;
  size?: "1024x1024" | "1024x1536" | "1536x1024" | "auto";
  quality?: ResponsesQuality;
  output_format?: ResponsesFormat;
  output_compression?: number;
  background?: ResponsesBackground;
  input_fidelity?: ResponsesInputFidelity;
  moderation?: ResponsesModeration;
  partial_images?: number;
  action?: "generate" | "edit" | "auto";
}

export interface ResponsesReasoning {
  effort: ResponsesReasoningEffort;
  summary?: ResponsesReasoningSummary;
}

export interface ResponsesMessageItem {
  type?: "message";
  role: "user" | "assistant" | "system" | "developer";
  content:
    | string
    | Array<
        | { type: "input_text"; text: string }
        | { type: "output_text"; text: string }
        | { type: "input_image"; image_url: string; detail?: "low" | "high" | "auto" }
      >;
}

export interface ResponsesFunctionTool {
  type: "function";
  name: string;
  description?: string;
  parameters: Record<string, unknown> | null;
  strict?: boolean;
}

export interface ResponsesWebSearchTool {
  type: "web_search" | "web_search_2025_08_26";
}

export interface ResponsesCodeInterpreterTool {
  type: "code_interpreter";
  container:
    | string
    | { type: "auto"; file_ids?: string[]; memory_limit?: "1g" | "4g" | "16g" | "64g" | null };
}

export interface ResponsesFileSearchTool {
  type: "file_search";
  vector_store_ids?: string[];
}

export type ResponsesAdditionalTool =
  | ResponsesWebSearchTool
  | ResponsesCodeInterpreterTool
  | ResponsesFileSearchTool
  | ResponsesFunctionTool;

export interface ResponsesParams {
  input: string | Array<ResponsesMessageItem>;
  model?: ResponsesTextModel;
  imageModel?: ResponsesImageModel;
  imageTool?: Partial<ResponsesImageToolConfig>;
  additionalTools?: ResponsesAdditionalTool[];
  instructions?: string;
  previous_response_id?: string;
  metadata?: Record<string, string>;
  parallel_tool_calls?: boolean;
  store?: boolean;
  truncation?: ResponsesTruncationMode;
  reasoning?: ResponsesReasoning;
  temperature?: number;
  top_p?: number;
  max_output_tokens?: number;
  max_tool_calls?: number;
  user?: string;
  apiKey?: string;
}

export type ValidationResult =
  | { ok: true; data: ResponsesParams }
  | { ok: false; error: string };

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function validateMessageItem(v: unknown): string | null {
  if (!isObject(v)) return "input array item must be an object";
  const role = v.role;
  if (role !== "user" && role !== "assistant" && role !== "system" && role !== "developer") {
    return "input item role must be one of user|assistant|system|developer";
  }
  if (!("content" in v)) return "input item missing content";
  const content = v.content;
  if (typeof content === "string") return null;
  if (!Array.isArray(content)) return "input item content must be string or array";
  for (const part of content) {
    if (!isObject(part)) return "input content part must be an object";
    const t = part.type;
    if (t !== "input_text" && t !== "output_text" && t !== "input_image") {
      return "input content part type must be input_text|output_text|input_image";
    }
    if ((t === "input_text" || t === "output_text") && typeof part.text !== "string") {
      return `${t} part requires string text`;
    }
    if (t === "input_image" && typeof part.image_url !== "string") {
      return "input_image part requires image_url string";
    }
  }
  return null;
}

function validateInput(input: unknown): string | true {
  if (typeof input === "string") return input.length > 0 ? true : "input must not be empty";
  if (!Array.isArray(input)) return "input must be a string or array";
  if (input.length === 0) return "input array must not be empty";
  for (let i = 0; i < input.length; i++) {
    const err = validateMessageItem(input[i]);
    if (err) return `input[${i}]: ${err}`;
  }
  return true;
}

function validateAdditionalTool(t: unknown): string | null {
  if (!isObject(t)) return "tool must be an object";
  const type = t.type;
  if (type === "web_search" || type === "web_search_2025_08_26") return null;
  if (type === "code_interpreter") {
    if (!("container" in t)) return "code_interpreter requires container";
    return null;
  }
  if (type === "file_search") return null;
  if (type === "function") {
    if (typeof t.name !== "string" || !t.name) return "function tool requires name";
    if (!("parameters" in t)) return "function tool requires parameters";
    return null;
  }
  return `unsupported tool type: ${String(type)}`;
}

export function validateResponsesParams(input: unknown): ValidationResult {
  if (!isObject(input)) {
    return { ok: false, error: "Request body must be an object" };
  }

  const inputErr = validateInput(input.input);
  if (inputErr !== true) {
    return { ok: false, error: inputErr };
  }

  const data: ResponsesParams = {
    input: input.input as ResponsesParams["input"],
  };

  if (input.model !== undefined) {
    if (
      typeof input.model !== "string" ||
      !(RESPONSES_TEXT_MODELS as readonly string[]).includes(input.model)
    ) {
      return {
        ok: false,
        error: `Invalid model. Allowed: ${RESPONSES_TEXT_MODELS.join(", ")}`,
      };
    }
    data.model = input.model as ResponsesTextModel;
  }

  if (input.imageModel !== undefined) {
    if (
      typeof input.imageModel !== "string" ||
      !(RESPONSES_IMAGE_MODELS as readonly string[]).includes(input.imageModel)
    ) {
      return {
        ok: false,
        error: `Invalid imageModel. Allowed: ${RESPONSES_IMAGE_MODELS.join(", ")} (dall-e-* is not supported as a Responses tool)`,
      };
    }
    data.imageModel = input.imageModel as ResponsesImageModel;
  }

  if (input.imageTool !== undefined) {
    if (!isObject(input.imageTool)) {
      return { ok: false, error: "imageTool must be an object" };
    }
    const it: Partial<ResponsesImageToolConfig> = { type: "image_generation" };
    if (input.imageTool.size !== undefined) {
      const sizes = ["1024x1024", "1024x1536", "1536x1024", "auto"];
      if (typeof input.imageTool.size !== "string" || !sizes.includes(input.imageTool.size)) {
        return { ok: false, error: `Invalid imageTool.size. Allowed: ${sizes.join(", ")}` };
      }
      it.size = input.imageTool.size as ResponsesImageToolConfig["size"];
    }
    if (input.imageTool.quality !== undefined) {
      if (
        typeof input.imageTool.quality !== "string" ||
        !(RESPONSES_QUALITIES as readonly string[]).includes(input.imageTool.quality)
      ) {
        return { ok: false, error: `Invalid imageTool.quality` };
      }
      it.quality = input.imageTool.quality as ResponsesQuality;
    }
    if (input.imageTool.output_format !== undefined) {
      if (
        typeof input.imageTool.output_format !== "string" ||
        !(RESPONSES_FORMATS as readonly string[]).includes(input.imageTool.output_format)
      ) {
        return { ok: false, error: `Invalid imageTool.output_format` };
      }
      it.output_format = input.imageTool.output_format as ResponsesFormat;
    }
    if (input.imageTool.output_compression !== undefined) {
      if (typeof input.imageTool.output_compression !== "number") {
        return { ok: false, error: "imageTool.output_compression must be a number" };
      }
      it.output_compression = input.imageTool.output_compression;
    }
    if (input.imageTool.background !== undefined) {
      if (
        typeof input.imageTool.background !== "string" ||
        !(RESPONSES_BACKGROUNDS as readonly string[]).includes(input.imageTool.background)
      ) {
        return { ok: false, error: `Invalid imageTool.background` };
      }
      it.background = input.imageTool.background as ResponsesBackground;
    }
    if (input.imageTool.input_fidelity !== undefined) {
      if (
        typeof input.imageTool.input_fidelity !== "string" ||
        !(RESPONSES_INPUT_FIDELITIES as readonly string[]).includes(input.imageTool.input_fidelity)
      ) {
        return {
          ok: false,
          error: `Invalid input_fidelity. Allowed: ${RESPONSES_INPUT_FIDELITIES.join(", ")}`,
        };
      }
      it.input_fidelity = input.imageTool.input_fidelity as ResponsesInputFidelity;
    }
    if (input.imageTool.moderation !== undefined) {
      if (
        typeof input.imageTool.moderation !== "string" ||
        !(RESPONSES_MODERATIONS as readonly string[]).includes(input.imageTool.moderation)
      ) {
        return { ok: false, error: `Invalid imageTool.moderation` };
      }
      it.moderation = input.imageTool.moderation as ResponsesModeration;
    }
    if (input.imageTool.partial_images !== undefined) {
      if (
        typeof input.imageTool.partial_images !== "number" ||
        input.imageTool.partial_images < 0 ||
        input.imageTool.partial_images > 3
      ) {
        return { ok: false, error: "imageTool.partial_images must be a number 0..3" };
      }
      it.partial_images = input.imageTool.partial_images;
    }
    if (input.imageTool.action !== undefined) {
      const actions = ["generate", "edit", "auto"];
      if (typeof input.imageTool.action !== "string" || !actions.includes(input.imageTool.action)) {
        return { ok: false, error: `Invalid imageTool.action` };
      }
      it.action = input.imageTool.action as ResponsesImageToolConfig["action"];
    }
    data.imageTool = it;
  }

  if (input.additionalTools !== undefined) {
    if (!Array.isArray(input.additionalTools)) {
      return { ok: false, error: "additionalTools must be an array" };
    }
    const tools: ResponsesAdditionalTool[] = [];
    for (let i = 0; i < input.additionalTools.length; i++) {
      const err = validateAdditionalTool(input.additionalTools[i]);
      if (err) return { ok: false, error: `additionalTools[${i}]: ${err}` };
      tools.push(input.additionalTools[i] as ResponsesAdditionalTool);
    }
    data.additionalTools = tools;
  }

  if (input.instructions !== undefined) {
    if (typeof input.instructions !== "string") {
      return { ok: false, error: "instructions must be a string" };
    }
    data.instructions = input.instructions;
  }

  if (input.previous_response_id !== undefined) {
    if (typeof input.previous_response_id !== "string") {
      return { ok: false, error: "previous_response_id must be a string" };
    }
    data.previous_response_id = input.previous_response_id;
  }

  if (input.metadata !== undefined) {
    if (!isObject(input.metadata)) {
      return { ok: false, error: "metadata must be an object" };
    }
    data.metadata = input.metadata as Record<string, string>;
  }

  if (input.parallel_tool_calls !== undefined) {
    if (typeof input.parallel_tool_calls !== "boolean") {
      return { ok: false, error: "parallel_tool_calls must be a boolean" };
    }
    data.parallel_tool_calls = input.parallel_tool_calls;
  }

  if (input.store !== undefined) {
    if (typeof input.store !== "boolean") {
      return { ok: false, error: "store must be a boolean" };
    }
    data.store = input.store;
  }

  if (input.truncation !== undefined) {
    if (
      typeof input.truncation !== "string" ||
      !(RESPONSES_TRUNCATION_MODES as readonly string[]).includes(input.truncation)
    ) {
      return {
        ok: false,
        error: `Invalid truncation. Allowed: ${RESPONSES_TRUNCATION_MODES.join(", ")}`,
      };
    }
    data.truncation = input.truncation as ResponsesTruncationMode;
  }

  if (input.reasoning !== undefined) {
    if (!isObject(input.reasoning)) {
      return { ok: false, error: "reasoning must be an object" };
    }
    const r = input.reasoning;
    if (
      typeof r.effort !== "string" ||
      !(RESPONSES_REASONING_EFFORTS as readonly string[]).includes(r.effort)
    ) {
      return {
        ok: false,
        error: `Invalid reasoning.effort. Allowed: ${RESPONSES_REASONING_EFFORTS.join(", ")}`,
      };
    }
    const reasoning: ResponsesReasoning = {
      effort: r.effort as ResponsesReasoningEffort,
    };
    if (r.summary !== undefined) {
      if (
        typeof r.summary !== "string" ||
        !(RESPONSES_REASONING_SUMMARIES as readonly string[]).includes(r.summary)
      ) {
        return {
          ok: false,
          error: `Invalid reasoning.summary. Allowed: ${RESPONSES_REASONING_SUMMARIES.join(", ")}`,
        };
      }
      reasoning.summary = r.summary as ResponsesReasoningSummary;
    }
    data.reasoning = reasoning;
  }

  if (input.temperature !== undefined) {
    if (typeof input.temperature !== "number") {
      return { ok: false, error: "temperature must be a number" };
    }
    data.temperature = input.temperature;
  }
  if (input.top_p !== undefined) {
    if (typeof input.top_p !== "number") {
      return { ok: false, error: "top_p must be a number" };
    }
    data.top_p = input.top_p;
  }
  if (input.max_output_tokens !== undefined) {
    if (
      typeof input.max_output_tokens !== "number" ||
      !Number.isInteger(input.max_output_tokens)
    ) {
      return { ok: false, error: "max_output_tokens must be an integer" };
    }
    data.max_output_tokens = input.max_output_tokens;
  }
  if (input.max_tool_calls !== undefined) {
    if (
      typeof input.max_tool_calls !== "number" ||
      !Number.isInteger(input.max_tool_calls)
    ) {
      return { ok: false, error: "max_tool_calls must be an integer" };
    }
    data.max_tool_calls = input.max_tool_calls;
  }
  if (input.user !== undefined) {
    if (typeof input.user !== "string") {
      return { ok: false, error: "user must be a string" };
    }
    data.user = input.user;
  }
  if (input.apiKey !== undefined) {
    if (typeof input.apiKey !== "string") {
      return { ok: false, error: "apiKey must be a string" };
    }
    data.apiKey = input.apiKey;
  }

  return { ok: true, data };
}