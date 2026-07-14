"use server";

import { logger } from "@/lib/observability/server/logger";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { canEditDocument } from "@/server/share/authorization";
import { normalizeShareEmail } from "@/server/share/utils";

type UpdatePresentationThumbnailUrlParams = {
  id: string;
  thumbnailUrl: string | null;
  onlyIfMissing?: boolean;
};

export async function updatePresentationThumbnailUrl({
  id,
  thumbnailUrl,
  onlyIfMissing = false,
}: UpdatePresentationThumbnailUrlParams) {
  const actionName =
    "presentation.presentationThumbnailActions.updatePresentationThumbnailUrl";
  const span = logger.startSpan(`presentation.server_action.${actionName}`, {
    attributes: {
      "allweone.scope": "presentation",
      "allweone.action.type": "server_action",
      "allweone.action.name": actionName,
    },
  });

  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new Error("Unauthorized");
    }

    const canEdit = await canEditDocument(id, {
      userId: currentUser.id,
      userEmail: currentUser.email
        ? normalizeShareEmail(currentUser.email)
        : null,
    });
    if (!canEdit) {
      return {
        success: false,
        message: "You do not have permission to edit this presentation",
      };
    }

    const supabase = await createClient();
    if (!supabase) {
      return {
        success: false,
        message: "Supabase is not configured",
      };
    }

    try {
      if (onlyIfMissing) {
        const { data, error } = await supabase
          .from("base_documents")
          .update({ thumbnail_url: thumbnailUrl })
          .eq("id", id)
          .is("thumbnail_url", null)
          .select("id");

        if (error) throw error;
        return {
          success: true,
          message: "Presentation thumbnail updated successfully",
          thumbnailUrl,
          updated: (data?.length ?? 0) > 0,
        };
      }

      const { error } = await supabase
        .from("base_documents")
        .update({ thumbnail_url: thumbnailUrl })
        .eq("id", id);

      if (error) throw error;

      return {
        success: true,
        message: "Presentation thumbnail updated successfully",
        thumbnailUrl,
        updated: true,
      };
    } catch (error) {
      console.error(error);
      return {
        success: false,
        message: "Failed to update presentation thumbnail",
      };
    }
  } catch (error) {
    span.error(error);
    throw error;
  } finally {
    span.end();
  }
}
