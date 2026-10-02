import { OpenAI } from "openai";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessage,
  type UIMessageStreamWriter,
} from "ai";
import { env } from "@/env";
import { OPENAI_RESPONSES_MODEL } from "@/constants/image-models";
import { csrfGuard } from "@/lib/csrf";
import { createClient, getClerkUserId } from "@/lib/supabase/server";

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
          enum: ["unsplash", "pixabay", "google", "pexels"],
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

/**
 * Persistence for the agent chat (migration 019 creates
 * `public.presentation_messages`).
 *
 * Shape contract:
 *   presentation_id uuid -> base_documents.id (the id in the
 *                         `/presentation/[id]` route and in `body.id`),
 *   user_id         text -> a Clerk id (`user_2abc...`), matching every other
 *                         identity column in the schema,
 *   role            text -> CHECK (role in ('user','assistant','system')),
 *   parts           jsonb -> the AI SDK `UIMessage["parts"]` array.
 *
 * Every helper below is best-effort: the caller must never fail because of a
 * database problem, so errors are logged and swallowed.
 */

/** Only these three values satisfy the table's CHECK constraint. */
type StoredRole = "user" | "assistant" | "system";

/**
 * `body.messages` is client-supplied, and the AI SDK's `UIMessage["role"]`
 * union is wider than the table's CHECK. Anything else (`tool`, an unknown
 * value, a non-string) is dropped rather than mapped, because a wrong mapping
 * would silently misattribute a message in the persisted history.
 */
function toStoredRole(value: unknown): StoredRole | null {
  return value === "user" || value === "assistant" || value === "system"
    ? value
    : null;
}

/** Keeps only plain objects with a string `type`, i.e. real `UIMessage` parts. */
function toStoredParts(value: unknown): Array<Record<string, unknown>> | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const parts = value.filter(
    (part): part is Record<string, unknown> =>
      Boolean(part) &&
      typeof part === "object" &&
      !Array.isArray(part) &&
      typeof (part as { type?: unknown }).type === "string",
  );

  return parts.length > 0 ? parts : null;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Supabase = NonNullable<Awaited<ReturnType<typeof createClient>>>;

type WriteContext = { supabase: Supabase; userId: string };

type MessageRow = {
  presentation_id: string;
  user_id: string;
  role: StoredRole;
  parts: Array<Record<string, unknown>>;
};

/**
 * Resolve the write context. `presentation_id` must be a real
 * `base_documents.id`; `body.id` falls back to the literal `"default"` when the
 * client sends no id (no saved presentation), which is not a uuid and would
 * only produce a foreign-key error, so persistence is skipped there.
 *
 * `getClerkUserId()` also lazily provisions the `users` row the `user_id`
 * foreign key points at.
 */
async function resolveWriteContext(
  presentationId: string,
): Promise<WriteContext | null> {
  if (!UUID_PATTERN.test(presentationId)) {
    return null;
  }

  const supabase = await createClient();
  if (!supabase) {
    return null;
  }

  const userId = await getClerkUserId();
  if (!userId) {
    return null;
  }

  return { supabase, userId };
}

/** Insert rows, swallowing every failure so the stream is never broken. */
async function insertMessages(
  context: WriteContext,
  presentationId: string,
  rows: Array<{ role: StoredRole; parts: Array<Record<string, unknown>> }>,
): Promise<void> {
  if (rows.length === 0) {
    return;
  }

  const payload: MessageRow[] = rows.map((row) => ({
    presentation_id: presentationId,
    user_id: context.userId,
    role: row.role,
    parts: row.parts,
  }));

  const { error } = await context.supabase
    .from("presentation_messages")
    .insert(payload);

  if (error) {
    console.error("Failed to persist presentation agent messages:", error);
  }
}

/**
 * Persist the user turns of the incoming request.
 *
 * The client sends its whole conversation, so re-inserting every message on
 * every turn would duplicate history. Only the messages after the last
 * assistant turn are new; anything that is not a `user` message is dropped
 * (the assistant half is written by this route from the stream). If the user
 * cleared the chat the client history restarts anyway, so this stays correct
 * across `clearPresentationChat`.
 */
async function persistIncomingUserMessages(
  presentationId: string,
  messages: UIMessage[],
): Promise<void> {
  try {
    let lastAssistantTurn = -1;
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      if (toStoredRole(messages[index]?.role) === "assistant") {
        lastAssistantTurn = index;
        break;
      }
    }

    const rows: Array<{ role: StoredRole; parts: Array<Record<string, unknown>> }> = [];
    for (const message of messages.slice(lastAssistantTurn + 1)) {
      const role = toStoredRole(message?.role);
      if (role !== "user") {
        continue;
      }
      const parts = toStoredParts(message?.parts);
      if (parts) {
        rows.push({ role, parts });
      }
    }

    if (rows.length === 0) {
      return;
    }

    const context = await resolveWriteContext(presentationId);
    if (!context) {
      return;
    }

    await insertMessages(context, presentationId, rows);
  } catch (error) {
    console.error("Failed to persist presentation user messages:", error);
  }
}

/**
 * Reassembles the streamed assistant message into `UIMessage["parts"]` while
 * the chunks are written, so the finished parts array can be persisted.
 */
function createPartCollector() {
  const parts: Array<Record<string, unknown>> = [];
  const indexByKey = new Map<string, number>();

  function upsert(key: string, create: (previous?: Record<string, unknown>) => Record<string, unknown>) {
    const at = indexByKey.get(key);
    if (at === undefined) {
      indexByKey.set(key, parts.length);
      parts.push(create());
      return;
    }
    parts[at] = create(parts[at]);
  }

  return {
    collect(chunk: Record<string, unknown>) {
      const type = typeof chunk.type === "string" ? chunk.type : "";

      if (type === "text-start") {
        const id = typeof chunk.id === "string" ? chunk.id : "";
        upsert(`text:${id}`, () => ({ type: "text", text: "" }));
        return;
      }

      if (type === "text-delta") {
        const id = typeof chunk.id === "string" ? chunk.id : "";
        const delta = typeof chunk.delta === "string" ? chunk.delta : "";
        upsert(`text:${id}`, (previous) => ({
          type: "text",
          text: `${typeof previous?.text === "string" ? previous.text : ""}${delta}`,
        }));
        return;
      }

      if (type.startsWith("tool-") && typeof chunk.toolCallId === "string") {
        const toolCallId = chunk.toolCallId;
        const state = typeof chunk.state === "string" ? chunk.state : "";
        upsert(`tool:${toolCallId}`, (previous) => ({
          type,
          toolCallId,
          state: state === "output-available" ? "output-available" : "input-available",
          input: chunk.input ?? previous?.input,
          ...(state === "output-available" ? { output: chunk.output } : {}),
        }));
      }
    },
    getParts(): Array<Record<string, unknown>> {
      return parts.filter((part) =>
        part.type === "tool-"
          ? true
          : typeof part.text === "string" && part.text.length > 0,
      );
    },
  };
}

/** Persist the completed assistant turn. Never throws. */
async function persistAssistantParts(
  presentationId: string,
  parts: Array<Record<string, unknown>>,
): Promise<void> {
  try {
    const stored = toStoredParts(parts);
    if (!stored) {
      return;
    }

    const context = await resolveWriteContext(presentationId);
    if (!context) {
      return;
    }

    await insertMessages(context, presentationId, [{ role: "assistant", parts: stored }]);
  } catch (error) {
    console.error("Failed to persist presentation assistant message:", error);
  }
}

export async function POST(req: Request) {
  try {
    const csrfError = csrfGuard(req);
    if (csrfError) return csrfError;
    if (csrfError) return csrfError;
    const body = (await req.json()) as {
      id?: string;
      messages?: UIMessage[];
      apiKey?: string;
    };

    const presentationId = body.id ?? "default";

    const messages: UIMessage[] = Array.isArray(body.messages) ? body.messages : [];
    const apiKey = body.apiKey || env.OPENAI_API_KEY;
    const openai = apiKey ? new OpenAI({ apiKey }) : null;
    const input = buildInput(messages);

    // The agent chat is persisted per `base_documents.id`, which is the same id
    // the editor route uses. A failure here must not stop the answer from
    // streaming, so the error is swallowed by the helper.
    await persistIncomingUserMessages(presentationId, messages);

    const stream = createUIMessageStream({
      execute: async ({ writer }: { writer: UIMessageStreamWriter }) => {
        const collector = createPartCollector();
        const write = (chunk: Record<string, unknown>) => {
          try {
            collector.collect(chunk);
          } catch {
            // Collector must never interfere with the stream.
          }
          (writer as any).write(chunk);
        };

        try {
          if (!openai) {
            write({ type: "text-start", id: "no-key" });
            write({
              type: "text-delta",
              id: "no-key",
              delta:
                "No OpenAI API key is configured. Set OPENAI_API_KEY (or pass apiKey) to enable the agent.",
            });
            write({ type: "text-end", id: "no-key" });
            return;
          }

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

                write({
                  type: `tool-${currentToolName}`,
                  toolCallId: currentCallId,
                  state: "input-streaming",
                  input: parsedArgs,
                });

                write({
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
                      write({
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
                write({
                  type: `tool-${currentToolName}`,
                  toolCallId: currentCallId,
                  state: "input-streaming",
                  input: parsedArgs,
                });

                write({
                  type: `tool-${currentToolName}`,
                  toolCallId: currentCallId,
                  state: "output-available",
                  output: "",
                });

                return;
              } else if (currentToolName === "respond_to_user") {
                const message =
                  typeof parsedArgs.message === "string" ? parsedArgs.message : "";

                write({ type: "text-start", id: currentCallId });
                write({
                  type: "text-delta",
                  id: currentCallId,
                  delta: message,
                });
                write({ type: "text-end", id: currentCallId });

                write({
                  type: `tool-${currentToolName}`,
                  toolCallId: currentCallId,
                  state: "input-streaming",
                  input: parsedArgs,
                });

                write({
                  type: `tool-${currentToolName}`,
                  toolCallId: currentCallId,
                  state: "output-available",
                  output: message,
                });

                return;
              }
            } else if (event.type === "response.output_text.delta") {
              write({
                type: "text-delta",
                id: event.item_id ?? currentCallId ?? "text",
                delta: event.delta,
              });
            }
          }
        } catch (innerError) {
          console.error("Stream processing error:", innerError);
          write({
            type: "error",
            errorText: innerError instanceof Error ? innerError.message : "Stream error",
          });
        } finally {
          // Persist whatever was streamed. Runs on every exit path (normal,
          // early `return` for client tools, and stream errors) and cannot
          // throw: a failed write must not cost the user their answer.
          await persistAssistantParts(presentationId, collector.getParts());
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
