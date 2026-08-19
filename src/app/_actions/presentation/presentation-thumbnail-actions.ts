"use server";

import { logger } from "@/lib/observability/server/logger";
import { createClient, getClerkUserId } from "@/lib/supabase/server";

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
      "smart.scope": "presentation",
      "smart.action.type": "server_action",
      "smart.action.name": actionName,
    },
  });

  try {
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
          .eq("user_id", await getClerkUserId())
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
        .eq("id", id)
        .eq("user_id", await getClerkUserId());

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
