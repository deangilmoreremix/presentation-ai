"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/server";

type BaseDocumentRow = {
  id: string;
  title: string;
  thumbnail_url: string | null;
  is_public: boolean;
  user_id: string;
  created_at: string;
  updated_at: string;
  user: { name: string | null; image: string | null } | { name: string | null; image: string | null }[] | null;
  presentation:
    | {
        id: string;
        content: unknown;
        theme: string | null;
        outline: string[] | null;
        presentation_style: string | null;
        language: string | null;
      }
    | Array<{
        id: string;
        content: unknown;
        theme: string | null;
        outline: string[] | null;
        presentation_style: string | null;
        language: string | null;
      }>
    | null;
};

/**
 * Get a public presentation without requiring authentication
 * This is used for the shared presentation view
 */
export async function getSharedPresentation(id: string) {
  try {
    const supabase = await createClient();
    if (!supabase) {
      return { success: false, message: "Supabase is not configured" };
    }

    const { data: presentation, error } = await supabase
      .from("base_documents")
      .select(
        "id, title, thumbnail_url, is_public, user_id, created_at, updated_at, presentation:presentations(id, content, theme, outline, presentation_style, language), user:users(name, image)",
      )
      .eq("id", id)
      .eq("is_public", true)
      .maybeSingle<BaseDocumentRow>();

    if (error) throw error;
    if (!presentation) {
      return { success: false, message: "Presentation not found or not public" };
    }

    // Transform snake_case row to camelCase for consumers.
    const pres = Array.isArray(presentation.presentation)
      ? presentation.presentation[0]
      : presentation.presentation;
    const user = Array.isArray(presentation.user)
      ? presentation.user[0]
      : presentation.user;
    const camelPresentation = {
      id: presentation.id,
      title: presentation.title,
      thumbnailUrl: presentation.thumbnail_url,
      isPublic: presentation.is_public,
      userId: presentation.user_id,
      createdAt: presentation.created_at,
      updatedAt: presentation.updated_at,
      presentation: pres
        ? {
            id: pres.id,
            content: pres.content,
            theme: pres.theme,
            outline: pres.outline,
            presentationStyle: pres.presentation_style,
            language: pres.language,
          }
        : null,
      user: user ?? null,
    };

    return { success: true, presentation: camelPresentation };
  } catch (error) {
    console.error("Error fetching shared presentation:", error);
    return { success: false, message: "Failed to fetch presentation" };
  }
}

/**
 * Toggle the public status of a presentation
 */
export async function togglePresentationPublicStatus(
  id: string,
  isPublic: boolean,
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { success: false, message: "Unauthorized" };
  }

  const supabase = await createClient();
  if (!supabase) {
    return { success: false, message: "Supabase is not configured" };
  }

  try {
    const { data: presentation, error } = await supabase
      .from("base_documents")
      .update({ is_public: isPublic })
      .eq("id", id)
      .eq("user_id", currentUser.id)
      .select("*")
      .maybeSingle();

    if (error) throw error;
    if (!presentation) {
      return { success: false, message: "Presentation not found" };
    }

    return {
      success: true,
      message: isPublic
        ? "Presentation is now publicly accessible"
        : "Presentation is now private",
      presentation: {
        id: presentation.id,
        title: presentation.title,
        thumbnailUrl: presentation.thumbnail_url,
        isPublic: presentation.is_public,
        userId: presentation.user_id,
        createdAt: presentation.created_at,
        updatedAt: presentation.updated_at,
      },
    };
  } catch (error) {
    console.error("Error updating presentation public status:", error);
    return { success: false, message: "Failed to update presentation public status" };
  }
}
