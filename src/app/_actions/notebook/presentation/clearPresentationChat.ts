"use server";

import { logger } from "@/lib/observability/server/logger";
import { auth } from "@/server/auth";
import { createClient, getClerkUserId } from "@/lib/supabase/server";

/**
 * Clear the persisted agent chat for a presentation.
 *
 * Deletes rows from `public.presentation_messages` where
 * `presentation_id` matches and `user_id` matches the caller.
 *
 * `presentationId` is the `base_documents.id` used by the editor route, which
 * is what the agent route writes to `presentation_id`.
 *
 * Ownership is enforced by the `user_id` filter rather than by RLS: the
 * server-side Supabase client uses the service-role key, which bypasses RLS,
 * so the explicit filter is the only thing preventing one user from clearing
 * another user's chat.
 *
 * Note: clearing the server-side history does not by itself clear the
 * client `useChat` state in the open agent panel. The caller (the
 * agent panel UI) is responsible for calling `useChat.setMessages([])`
 * after this mutation succeeds.
 */
export async function clearPresentationChat(presentationId: string): Promise<{
  success: boolean;
  message: string;
}> {
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
      return { success: true, message: "Presentation chat cleared" };
    }

    const userId = await getClerkUserId();

    const { error } = await supabase
      .from("presentation_messages")
      .delete()
      .eq("presentation_id", presentationId)
      .eq("user_id", userId);

    if (error) {
      span.error(error);
      throw error;
    }

    return { success: true, message: "Presentation chat cleared" };
  } catch (error) {
    span.error(error);
    throw error;
  } finally {
    span.end();
  }
}
