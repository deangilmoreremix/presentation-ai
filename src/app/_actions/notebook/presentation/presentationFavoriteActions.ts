"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/server";

type PresentationFavoriteResult = {
  success: boolean;
  message: string;
  isFavorite?: boolean;
};

type DocumentAccessRow = {
  is_public: boolean;
  type: string;
  user_id: string;
};

type FavoriteRow = {
  id: string;
  user_id: string;
  document_id: string;
};

async function canFavoritePresentation(
  documentId: string,
  userId: string,
): Promise<boolean> {
  const supabase = await createClient();
  if (!supabase) return false;

  const { data: document, error } = await supabase
    .from("base_documents")
    .select("is_public, type, user_id")
    .eq("id", documentId)
    .maybeSingle<DocumentAccessRow>();

  if (error || !document) return false;

  return (
    document.type === "PRESENTATION" &&
    (document.is_public || document.user_id === userId)
  );
}

export async function addPresentationToFavorites(
  documentId: string,
): Promise<PresentationFavoriteResult> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { success: false, message: "Unauthorized", isFavorite: false };
  }

  const supabase = await createClient();
  if (!supabase) {
    return {
      success: false,
      message: "Supabase is not configured",
      isFavorite: false,
    };
  }

  if (!(await canFavoritePresentation(documentId, currentUser.id))) {
    return {
      success: false,
      message: "Presentation not found",
      isFavorite: false,
    };
  }

  // Upsert on the (user_id, document_id) unique constraint.
  const { error } = await supabase
    .from("favorite_documents")
    .upsert(
      { user_id: currentUser.id, document_id: documentId },
      { onConflict: "user_id,document_id", ignoreDuplicates: true },
    );

  if (error) {
    console.error(error);
    return { success: false, message: "Failed to add favorite", isFavorite: false };
  }

  return {
    success: true,
    message: "Presentation added to favorites",
    isFavorite: true,
  };
}

export async function removePresentationFromFavorites(
  documentId: string,
): Promise<PresentationFavoriteResult> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { success: false, message: "Unauthorized", isFavorite: false };
  }

  const supabase = await createClient();
  if (!supabase) {
    return {
      success: false,
      message: "Supabase is not configured",
      isFavorite: false,
    };
  }

  if (!(await canFavoritePresentation(documentId, currentUser.id))) {
    return {
      success: false,
      message: "Presentation not found",
      isFavorite: false,
    };
  }

  const { error } = await supabase
    .from("favorite_documents")
    .delete()
    .eq("user_id", currentUser.id)
    .eq("document_id", documentId);

  if (error) {
    console.error(error);
    return { success: false, message: "Failed to remove favorite", isFavorite: false };
  }

  return {
    success: true,
    message: "Presentation removed from favorites",
    isFavorite: false,
  };
}

export async function togglePresentationFavorite(
  documentId: string,
): Promise<PresentationFavoriteResult> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { success: false, message: "Unauthorized", isFavorite: false };
  }

  const supabase = await createClient();
  if (!supabase) {
    return {
      success: false,
      message: "Supabase is not configured",
      isFavorite: false,
    };
  }

  if (!(await canFavoritePresentation(documentId, currentUser.id))) {
    return {
      success: false,
      message: "Presentation not found",
      isFavorite: false,
    };
  }

  const { data: existing, error: findErr } = await supabase
    .from("favorite_documents")
    .select("id")
    .eq("user_id", currentUser.id)
    .eq("document_id", documentId)
    .maybeSingle<FavoriteRow>();

  if (findErr) {
    console.error(findErr);
    return { success: false, message: "Failed to check favorite", isFavorite: false };
  }

  if (existing) {
    const { error: delErr } = await supabase
      .from("favorite_documents")
      .delete()
      .eq("id", existing.id);
    if (delErr) {
      console.error(delErr);
      return { success: false, message: "Failed to remove favorite", isFavorite: false };
    }
    return {
      success: true,
      message: "Presentation removed from favorites",
      isFavorite: false,
    };
  }

  const { error: insErr } = await supabase
    .from("favorite_documents")
    .insert({ user_id: currentUser.id, document_id: documentId });

  if (insErr) {
    console.error(insErr);
    return { success: false, message: "Failed to add favorite", isFavorite: false };
  }

  return {
    success: true,
    message: "Presentation added to favorites",
    isFavorite: true,
  };
}
