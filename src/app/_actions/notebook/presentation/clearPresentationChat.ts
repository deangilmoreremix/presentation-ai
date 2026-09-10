"use server";

import { logger } from "@/lib/observability/server/logger";
import { auth } from "@/server/auth";
import { createClient } from "@/lib/supabase/server";

/**
 * Clear the persisted agent chat for a presentation.
 *
 * Deletes all rows from `public.presentation_messages` (migration 015)
 * where `presentation_id` matches and `user_id` matches the caller.
 * RLS enforces ownership, so this is a safe idempotent operation.
 *
 * Note: clearing the server-side history does not by itself clear the
 * client `useChat` state in the open agent panel. The caller (the
 * agent panel UI) is responsible for calling `useChat.setMessages([])`
 * after this mutation succeeds.
 */
export async function clearPresentationChat(presentationId: string) {
  const actionName = "presentation.clearPresentationChat.clearPresentationChat";
  const span = logger.startSpan(`notebook.server_action.${actionName}`, {
    attributes: {
      "smart-presentations.scope": "notebook",
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
      return { success: true };
    }

    const { error } = await supabase
      .from("presentation_messages")
      .delete()
      .eq("presentation_id", presentationId)
      .eq("user_id", session.user.id);

    if (error) {
      span.error(error);
      throw error;
    }

    return { success: true };
  } catch (error) {
    span.error(error);
    throw error;
  } finally {
    span.end();
  }
}
