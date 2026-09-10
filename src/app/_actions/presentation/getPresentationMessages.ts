"use server";

import { type UIMessage } from "ai";

import { logger } from "@/lib/observability/server/logger";
import { auth } from "@/server/auth";
import { createClient } from "@/lib/supabase/server";

/**
 * Get persisted chat messages for a presentation.
 *
 * Reads from `public.presentation_messages` (migration 015). The agent
 * route at `/api/agent/presentation` is responsible for inserting rows
 * into this table as the conversation progresses — see the TODO comment
 * in that route for the integration point. Until that write is wired,
 * this action returns an empty array.
 *
 * The returned rows are mapped to the AI SDK `UIMessage` shape:
 *   { id, role, parts }
 * ordered by `created_at` ascending.
 */
export async function getPresentationMessages(
  presentationId: string,
): Promise<UIMessage[]> {
  const actionName = "presentation.getPresentationMessages.getPresentationMessages";
  const span = logger.startSpan(`presentation.server_action.${actionName}`, {
    attributes: {
      "smart-presentations.scope": "presentation",
      "smart-presentations.action.type": "server_action",
      "smart-presentations.action.name": actionName,
      "smart-presentations.presentation.id": presentationId,
    },
  });

  try {
    const session = await auth();
    if (!session?.user) {
      throw new Error("Unauthorized");
    }

    const supabase = await createClient();
    if (!supabase) {
      // Supabase not configured (local dev without DB). Return empty
      // so the UI can still render the "no messages" state.
      return [];
    }

    const { data, error } = await supabase
      .from("presentation_messages")
      .select("id, role, parts, created_at")
      .eq("presentation_id", presentationId)
      .order("created_at", { ascending: true });

    if (error) {
      span.error(error);
      // Don't throw on read errors — return empty so the UI degrades
      // gracefully if the table is missing or RLS blocks.
      return [];
    }

    return (data ?? []).map((row) => ({
      id: row.id,
      role: row.role as UIMessage["role"],
      parts: (row.parts ?? []) as UIMessage["parts"],
    }));
  } catch (error) {
    span.error(error);
    throw error;
  } finally {
    span.end();
  }
}
