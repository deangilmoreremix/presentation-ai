import { OpenAI } from "openai";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessage,
  type UIMessageStreamWriter,
} from "ai";
import { getOpenAIClient } from "@/lib/openai/client";
import { OPENAI_RESPONSES_MODEL } from "@/constants/image-models";
import { env } from "@/env";

const CLIENT_TOOLS = new Set([
  "edit_slide_properties",
  "replace_image",
  "change_theme",
  "create_custom_theme",
  "update_custom_theme",
  "regenerate_slide",
  "create_slide",
  "delete_slide",
]);

const TOOLS = [
  {
    type: "function",
    name: "edit_slide_properties",
    description: "Edit the properties of a slide such as background color, alignment, layout, and width.",
    parameters: {
      type: "object",
      properties: {
        scope: {
          type: "string",
          enum: ["all"],
          description:
            "Scope of the action: 'all' for all slides. Defaults to 'all' if not specified.",
        },
        slideIds: {
          type: "array",
          items: { type: "string" },
          description: "Specific slide ids to apply the action to.",
        },
        bgColor: {
          type: "string",
          description: "The background color of the slide, use 'reset' to reset.",
        },
        alignment: {
          type: "string",
          enum: ["start", "center", "end", "reset"],
          description: "The content alignment of the slide.",
        },
        layoutType: {
          type: "string",
          enum: ["left", "right", "vertical", "background", "reset"],
          description: "Determines where the accent / root image appears in the slide.",
        },
        width: {
          type: "string",
          enum: ["S", "M", "L", "reset"],
          description: "The width of the slide.",
        },
      },
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "replace_image",
    description:
      "Replace the root image of a slide. If the user also asked for slide text, layout, or content changes, call create_slide or regenerate_slide first.",
    parameters: {
      type: "object",
      properties: {
        scope: {
          type: "string",
          enum: ["all"],
          description: "Scope of the action: 'all' for all slides.",
        },
        slideIds: {
          type: "array",
          items: { type: "string" },
          description: "Specific slide ids to apply the action to.",
        },
        imageUrl: {
          type: "string",
          description: "The URL of the image to replace.",
        },
        imagePrompt: {
          type: "string",
          description: "Image request for the replacement.",
        },
        imageSource: {
          type: "string",
          enum: ["ai", "stock", "gif"],
          description: "How the imagePrompt should be resolved.",
        },
        stockImageProvider: {
          type: "string",
          enum: ["unsplash", "pixabay", "google"],
          description: "Preferred stock provider when imageSource is 'stock'.",
        },
      },
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "change_theme",
    description:
      "Apply an existing built-in presentation theme. Use create_custom_theme when the user asks for custom fonts, custom colors, brand styling, or a new theme.",
    parameters: {
      type: "object",
      properties: {
        theme: {
          type: "string",
          description: "The built-in theme id to apply.",
        },
      },
      required: ["theme"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "create_custom_theme",
    description:
      "Create and apply a custom presentation theme. Use this for custom visual identity, brand styling, font changes, palettes, or backgrounds.",
    parameters: {
      type: "object",
      properties: {
        isPublic: {
          type: "boolean",
          description: "Whether the new custom theme should be public.",
        },
        themeData: {
          type: "object",
          description:
            "Partial custom theme data. Only include colors, fonts, and background values. smartLayout is the fill color for SVG layout elements. cardBackground is the readable text container surface.",
        },
      },
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "update_custom_theme",
    description:
      "Update the currently selected custom presentation theme and apply it. If the current theme is built-in, the app will create a new custom theme from this data instead.",
    parameters: {
      type: "object",
      properties: {
        isPublic: {
          type: "boolean",
          description: "Whether the custom theme should be public.",
        },
        themeData: {
          type: "object",
          description:
            "Partial replacement theme data. Only include colors, fonts, and background values.",
        },
      },
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "regenerate_slide",
    description:
      "Regenerate one or more existing slides. Return exactly two arrays: slideIds and slides (array of XML <SECTION> strings).",
    parameters: {
      type: "object",
      properties: {
        slideIds: {
          type: "array",
          items: { type: "string" },
          minItems: 1,
          description: "Array of slide ids to regenerate. Order must match the `slides` array.",
        },
        slides: {
          type: "array",
          items: { type: "string" },
          minItems: 1,
          description: "Array of XML <SECTION> strings. Each item is a single slide's content.",
        },
      },
      required: ["slideIds", "slides"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "create_slide",
    description:
      "Create one or more slides. Return an array of XML <SECTION> strings and optionally the slide id to insert after.",
    parameters: {
      type: "object",
      properties: {
        slides: {
          type: "array",
          items: { type: "string" },
          minItems: 1,
          description:
            "Array of XML <SECTION> strings. Each item is a single slide's content.",
        },
        afterSlideId: {
          type: "string",
          description:
            "Insert new slides immediately after this slide id. If omitted or not found, append to the end.",
        },
      },
      required: ["slides"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "delete_slide",
    description: "Delete one or more slides by id.",
    parameters: {
      type: "object",
      properties: {
        slideIds: {
          type: "array",
          items: { type: "string" },
          minItems: 1,
          description: "Array of slide ids to delete.",
        },
      },
      required: ["slideIds"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "webSearch",
    description: "Search the web for current information relevant to the presentation topic.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The search query.",
        },
      },
      required: ["query"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "respond_to_user",
    description:
      "Respond to the user with a short summary. Call this when no slide edit is needed.",
    parameters: {
      type: "object",
      properties: {
        message: {
          type: "string",
          description: "The message to respond with.",
        },
      },
      required: ["message"],
      additionalProperties: false,
    },
  },
] as any[];

async function executeWebSearch(query: string): Promise<string> {
  const tavilyApiKey = env.TAVILY_API_KEY;
  if (!tavilyApiKey) {
    return "Web search is unavailable.";
  }

  try {
    const { tavily } = await import("@tavily/core");
    const service = tavily({ apiKey: tavilyApiKey });
    const result = await service.search(query, { max_results: 5 });
    return JSON.stringify(result);
  } catch (error) {
    console.error("Tavily search error:", error);
    return "Search failed.";
  }
}

function buildInput(messages: UIMessage[]): Array<Record<string, unknown>> {
  const input: Array<Record<string, unknown>> = [];

  for (const message of messages) {
    if (message.role === "user") {
      const text = message.parts
        .filter((p): p is { type: "text"; text: string } => p.type === "text")
        .map((p) => p.text)
        .join("");

      if (text) {
        input.push({ role: "user", content: text });
      }

      for (const part of message.parts) {
        if (typeof part.type === "string" && part.type.startsWith("tool-")) {
          const toolName = part.type.slice(5);
          const uiPart = part as Record<string, unknown>;
          if (uiPart.state === "output-available" && typeof uiPart.output === "string") {
            input.push({
              type: "function_call_output",
              call_id: uiPart.toolCallId ?? part.type,
              output: uiPart.output,
            });
          }
        }
      }
    } else if (message.role === "assistant") {
      const text = message.parts
        .filter((p): p is { type: "text"; text: string } => p.type === "text")
        .map((p) => p.text)
        .join("");

      if (text) {
        input.push({ role: "assistant", content: text });
      }

      for (const part of message.parts) {
        if (
          typeof part.type === "string" &&
          part.type.startsWith("tool-")
        ) {
          const uiPart = part as Record<string, unknown>;
          if (uiPart.state === "output-available" && typeof uiPart.output === "string") {
            input.push({
              type: "function_call_output",
              call_id: uiPart.toolCallId ?? part.type,
              output: uiPart.output,
            });
          }
        }
      }
    }
  }

  return input;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      id?: string;
      messages?: UIMessage[];
      apiKey?: string;
    };

    if (!body.id) {
      return new Response("Missing presentation id", { status: 400 });
    }

    const messages: UIMessage[] = Array.isArray(body.messages) ? body.messages : [];
    const openai = await getOpenAIClient(undefined, body.apiKey);
    const input = buildInput(messages);

    const stream = createUIMessageStream({
      execute: async ({ writer }: { writer: UIMessageStreamWriter }) => {
        try {
          const responseStream = openai.responses.stream({
            model: OPENAI_RESPONSES_MODEL,
            input: input as any,
            tools: TOOLS as any,
            tool_choice: "required",
          });

          let argsAccum = "";
          let currentCallId: string | null = null;
          let currentToolName: string | null = null;

          for await (const event of responseStream) {
            if (event.type === "response.output_item.added") {
              const item = event.item;

              if (item.type === "function_call") {
                currentCallId = item.call_id;
                currentToolName = item.name;
                argsAccum = "";
              }
            } else if (event.type === "response.function_call_arguments.delta") {
              if (currentCallId !== null) {
                argsAccum += event.delta;
              }
            } else if (event.type === "response.function_call_arguments.done") {
              if (currentCallId === null || currentToolName === null) continue;

              let parsedArgs: Record<string, unknown> = {};
              try {
                parsedArgs = JSON.parse(argsAccum);
              } catch {
                parsedArgs = { raw: argsAccum };
              }

              if (currentToolName === "webSearch") {
                const query = typeof parsedArgs.query === "string" ? parsedArgs.query : "";
                const result = await executeWebSearch(query);

                (writer as any).write({
                  type: `tool-${currentToolName}`,
                  toolCallId: currentCallId,
                  state: "input-streaming",
                  input: parsedArgs,
                });

                (writer as any).write({
                  type: `tool-${currentToolName}`,
                  toolCallId: currentCallId,
                  state: "output-available",
                  output: result,
                });

                const updatedInput = [
                  ...input,
                  {
                    type: "function_call_output",
                    call_id: currentCallId,
                    output: result,
                  },
                ];

                const continueStream = openai.responses.stream({
                  model: OPENAI_RESPONSES_MODEL,
                  input: updatedInput as any,
                  tools: TOOLS as any,
                  tool_choice: "required",
                });

                try {
                  for await (const ev of continueStream) {
                    if (ev.type === "response.output_text.delta") {
                      writer.write({
                        type: "text-delta",
                        id: ev.item_id ?? currentCallId,
                        delta: ev.delta,
                      });
                    } else if (ev.type === "response.completed") {
                      break;
                    }
                  }
                } catch {
                  // stream ended
                }
              } else if (CLIENT_TOOLS.has(currentToolName)) {
                (writer as any).write({
                  type: `tool-${currentToolName}`,
                  toolCallId: currentCallId,
                  state: "input-streaming",
                  input: parsedArgs,
                });

                (writer as any).write({
                  type: `tool-${currentToolName}`,
                  toolCallId: currentCallId,
                  state: "output-available",
                  output: "",
                });

                return;
              } else if (currentToolName === "respond_to_user") {
                const message =
                  typeof parsedArgs.message === "string" ? parsedArgs.message : "";

                writer.write({ type: "text-start", id: currentCallId });
                writer.write({
                  type: "text-delta",
                  id: currentCallId,
                  delta: message,
                });
                writer.write({ type: "text-end", id: currentCallId });

                (writer as any).write({
                  type: `tool-${currentToolName}`,
                  toolCallId: currentCallId,
                  state: "input-streaming",
                  input: parsedArgs,
                });

                (writer as any).write({
                  type: `tool-${currentToolName}`,
                  toolCallId: currentCallId,
                  state: "output-available",
                  output: message,
                });

                return;
              }
            } else if (event.type === "response.output_text.delta") {
              writer.write({
                type: "text-delta",
                id: event.item_id ?? currentCallId ?? "text",
                delta: event.delta,
              });
            }
          }
        } catch (innerError) {
          console.error("Stream processing error:", innerError);
          writer.write({
            type: "error",
            errorText: innerError instanceof Error ? innerError.message : "Stream error",
          });
        }
      },
    });

    return createUIMessageStreamResponse({ stream });
  } catch (error) {
    console.error("Presentation agent route error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal Server Error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
