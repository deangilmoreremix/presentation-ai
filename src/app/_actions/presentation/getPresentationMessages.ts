"use server";

import { type UIMessage } from "ai";

import { logger } from "@/lib/observability/server/logger";
import { auth } from "@/server/auth";
import { createClient, getClerkUserId } from "@/lib/supabase/server";

/**
 * Get persisted chat messages for a presentation.
 *
 * Reads from `public.presentation_messages` (created by migration 019 for the
 * schema declared in migration 015). Rows are written by the agent route at
 * `/api/agent/presentation` as the conversation streams.
 *
 * `presentationId` is the `base_documents.id` used by the editor route -- the
 * same value the route writes to `presentation_id`.
 *
 * Every row is scoped to the caller: `presentation_id` alone is not enough,
 * because a shared or public presentation id is not a secret.
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

    // `user_id` holds a Clerk id (`user_2abc...`); `getClerkUserId()` also
    // provisions the `users` row so reads of an unauthenticated-but-provisioned
    // account stay consistent with the write path.
    const userId = await getClerkUserId();

    const { data, error } = await supabase
      .from("presentation_messages")
      .select("id, role, parts, created_at")
      .eq("presentation_id", presentationId)
      .eq("user_id", userId)
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
