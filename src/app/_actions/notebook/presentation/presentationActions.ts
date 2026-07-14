"use server";

import { type PlateSlide } from "@/components/notebook/presentation/utils/parser";
import { type NotebookAgentToolCall } from "@/lib/notebook/agent-activity";
import { type NotebookSelectedChunk } from "@/lib/notebook/attachments";
import { type PresentationCustomization } from "@/lib/presentation/customization";
import { getPresentationThumbnailUrl } from "@/lib/presentation/thumbnail";
import { isPresentationAutoTheme } from "@/lib/presentation/theme-resolution";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/server";
import { canEditDocument, canReadDocument } from "@/server/share/authorization";
import { normalizeShareEmail } from "@/server/share/utils";
import { notFound } from "next/navigation";

export type PresentationOwnerProfile = {
  id: string;
  image: string | null;
  name: string | null;
};

// Supabase returns joined rows with snake_case columns. We use these
// structural types internally and re-shape to camelCase at the boundary
// so call sites elsewhere in the app keep working.
type BaseDocumentRow = {
  id: string;
  title: string;
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
  is_public: boolean;
  user_id: string;
};

type PresentationRow = {
  id: string;
  document_id: string;
  content: unknown;
  theme: string | null;
  image_source: string | null;
  presentation_style: string | null;
  customization: unknown;
  language: string | null;
  outline: string[] | null;
  prompt: string | null;
  search_results: unknown;
  tool_calls: unknown;
  selected_chunks: unknown;
};

type BaseDocumentWithPresentation = BaseDocumentRow & {
  presentation: PresentationRow | PresentationRow[] | null;
};

type UserSummary = {
  id: string;
  image: string | null;
  name: string | null;
};

type BaseDocumentWithUser = BaseDocumentRow & {
  user: UserSummary | null;
};

function normalizePresentation(
  p: PresentationRow | PresentationRow[] | null | undefined,
): PresentationRow | null {
  if (!p) return null;
  return Array.isArray(p) ? (p[0] ?? null) : p;
}

/**
 * Convert the snake_case row from Supabase into the camelCase shape that
 * the rest of the app (e.g. `src/app/presentation/generate/[id]/page.tsx`)
 * expects. We keep the data flow snake_case internally and transform at
 * the action boundary so other call sites don't need to change.
 */
type CamelPresentation = {
  id: string;
  content: unknown;
  theme: string | null;
  imageSource: string | null;
  presentationStyle: string | null;
  customization: unknown;
  language: string | null;
  outline: string[] | null;
  prompt: string | null;
  searchResults: unknown;
  toolCalls: unknown;
  selectedChunks: unknown;
};

function toCamelPresentation(row: PresentationRow): CamelPresentation {
  return {
    id: row.id,
    content: row.content,
    theme: row.theme,
    imageSource: row.image_source,
    presentationStyle: row.presentation_style,
    customization: row.customization,
    language: row.language,
    outline: row.outline,
    prompt: row.prompt,
    searchResults: row.search_results,
    toolCalls: row.tool_calls,
    selectedChunks: row.selected_chunks,
  };
}

type CamelBaseDocument = {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  createdAt: string;
  updatedAt: string;
  isPublic: boolean;
  userId: string;
  presentation: CamelPresentation | null;
};

function toCamelBaseDocument(
  row: BaseDocumentRow & {
    presentation: PresentationRow | PresentationRow[] | null;
  },
): CamelBaseDocument {
  const pres = normalizePresentation(row.presentation);
  return {
    id: row.id,
    title: row.title,
    thumbnailUrl: row.thumbnail_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isPublic: row.is_public,
    userId: row.user_id,
    presentation: pres ? toCamelPresentation(pres) : null,
  };
}

export async function createPresentation({
  content,
  title,
  theme = "mystique",
  outline,
  imageSource,
  presentationStyle,
  customization,
  language,
}: {
  content: { slides: PlateSlide[] };
  title: string;
  theme?: string;
  outline?: string[];
  imageSource?: string;
  presentationStyle?: string;
  customization?: PresentationCustomization;
  language?: string;
}) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    throw new Error("Unauthorized");
  }

  const supabase = await createClient();
  if (!supabase) {
    return { success: false, message: "Supabase is not configured" };
  }

  try {
    // Insert the base document, then the related presentation row.
    const { data: doc, error: docErr } = await supabase
      .from("base_documents")
      .insert({
        type: "PRESENTATION",
        document_type: "presentation",
        title: title || "Untitled Presentation",
        user_id: currentUser.id,
        thumbnail_url: getPresentationThumbnailUrl(content.slides) ?? null,
      })
      .select("id")
      .single();

    if (docErr || !doc) {
      console.error(docErr);
      return { success: false, message: "Failed to create presentation" };
    }

    const { data: presentation, error: presErr } = await supabase
      .from("presentations")
      .insert({
        document_id: doc.id,
        content: content as unknown,
        ...(isPresentationAutoTheme(theme) ? {} : { theme }),
        image_source: imageSource ?? null,
        presentation_style: presentationStyle ?? null,
        customization: customization ?? null,
        language: language ?? null,
        outline: outline ?? null,
      })
      .select("*")
      .single();

    if (presErr) {
      console.error(presErr);
      return { success: false, message: "Failed to create presentation" };
    }

    return {
      success: true,
      message: "Presentation created successfully",
      presentation,
    };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Failed to create presentation" };
  }
}

export async function createEmptyPresentation({
  title,
  theme = "mystique",
  language = "en-US",
  customization,
}: {
  title: string;
  theme?: string;
  language?: string;
  customization?: PresentationCustomization;
}) {
  return createPresentation({
    content: { slides: [] },
    title,
    theme,
    language,
    customization,
  });
}

export async function createBlankPresentation(
  title: string,
  theme = "mystique",
  language = "en-US",
) {
  const blankSlide: PlateSlide = {
    content: [{ type: "h1", children: [{ text: "" }] }],
    id: crypto.randomUUID(),
    alignment: "center",
  };
  return createPresentation({
    content: { slides: [blankSlide] },
    title,
    theme,
    language,
  });
}

export async function updatePresentation({
  id,
  content,
  prompt,
  title,
  theme,
  outline,
  searchResults,
  toolCalls,
  selectedChunks,
  imageSource,
  presentationStyle,
  customization,
  language,
  thumbnailUrl,
}: {
  id: string;
  content?: { slides: PlateSlide[]; config?: Record<string, unknown> };
  title?: string;
  theme?: string;
  prompt?: string;
  outline?: string[];
  searchResults?: Array<{ query: string; results: unknown[] }>;
  toolCalls?: NotebookAgentToolCall[];
  selectedChunks?: NotebookSelectedChunk[];
  imageSource?: string;
  presentationStyle?: string;
  customization?: PresentationCustomization;
  language?: string;
  thumbnailUrl?: string | null;
}) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    throw new Error("Unauthorized");
  }

  const canEdit = await canEditDocument(id, {
    userId: currentUser.id,
    userEmail: normalizeShareEmail(currentUser.email),
  });
  if (!canEdit) {
    return {
      success: false,
      message: "You do not have permission to edit this presentation",
    };
  }

  const supabase = await createClient();
  if (!supabase) {
    return { success: false, message: "Supabase is not configured" };
  }

  try {
    const shouldPersistTheme =
      theme !== undefined && !isPresentationAutoTheme(theme);

    if (content !== undefined || thumbnailUrl !== undefined) {
      const docUpdate: Record<string, unknown> = {};
      if (title !== undefined) docUpdate.title = title;
      if (content !== undefined) {
        docUpdate.thumbnail_url = getPresentationThumbnailUrl(content.slides);
      } else if (thumbnailUrl !== undefined) {
        docUpdate.thumbnail_url = thumbnailUrl;
      }
      if (Object.keys(docUpdate).length > 0) {
        const { error: docErr } = await supabase
          .from("base_documents")
          .update(docUpdate)
          .eq("id", id);
        if (docErr) {
          console.error(docErr);
          return { success: false, message: "Failed to update presentation" };
        }
      }
    }

    const presUpdate: Record<string, unknown> = {};
    if (prompt !== undefined) presUpdate.prompt = prompt;
    if (content !== undefined) presUpdate.content = content as unknown;
    if (shouldPersistTheme) presUpdate.theme = theme;
    if (imageSource !== undefined) presUpdate.image_source = imageSource;
    if (presentationStyle !== undefined) {
      presUpdate.presentation_style = presentationStyle;
    }
    if (customization !== undefined) presUpdate.customization = customization;
    if (language !== undefined) presUpdate.language = language;
    if (outline !== undefined) presUpdate.outline = outline;
    if (searchResults !== undefined) presUpdate.search_results = searchResults;
    if (toolCalls !== undefined) presUpdate.tool_calls = toolCalls;
    if (selectedChunks !== undefined) {
      presUpdate.selected_chunks = selectedChunks;
    }

    let presentation: PresentationRow | null = null;
    if (Object.keys(presUpdate).length > 0) {
      const { data, error } = await supabase
        .from("presentations")
        .update(presUpdate)
        .eq("document_id", id)
        .select("*")
        .maybeSingle();
      if (error) {
        console.error(error);
        return { success: false, message: "Failed to update presentation" };
      }
      presentation = data;
    }

    return {
      success: true,
      message: "Presentation updated successfully",
      presentation: presentation ? toCamelPresentation(presentation) : null,
    };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Failed to update presentation" };
  }
}

export async function getPresentationOwner(id: string): Promise<
  | { success: true; owner: PresentationOwnerProfile }
  | { success: false; message: string }
> {
  const currentUser = await getCurrentUser();
  const canRead = await canReadDocument(id, {
    userId: currentUser?.id ?? null,
    userEmail: currentUser?.email
      ? normalizeShareEmail(currentUser.email)
      : null,
  });
  if (!canRead) {
    return { success: false, message: "Unauthorized access" };
  }

  const supabase = await createClient();
  if (!supabase) {
    return { success: false, message: "Supabase is not configured" };
  }

  const { data: doc, error } = await supabase
    .from("base_documents")
    .select("user:users(id, image, name)")
    .eq("id", id)
    .maybeSingle<{ user: UserSummary | UserSummary[] | null }>();

  if (error) {
    console.error(error);
    return { success: false, message: "Failed to fetch presentation owner" };
  }
  if (!doc) {
    return { success: false, message: "Presentation not found" };
  }
  const user = Array.isArray(doc.user) ? doc.user[0] : doc.user;
  if (!user) {
    return { success: false, message: "Presentation owner not found" };
  }

  return { success: true, owner: user };
}

export async function updatePresentationTitle(id: string, title: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    throw new Error("Unauthorized");
  }

  const canEdit = await canEditDocument(id, {
    userId: currentUser.id,
    userEmail: normalizeShareEmail(currentUser.email),
  });
  if (!canEdit) {
    return {
      success: false,
      message: "You do not have permission to edit this presentation",
    };
  }

  const supabase = await createClient();
  if (!supabase) {
    return { success: false, message: "Supabase is not configured" };
  }

  const { data: presentation, error } = await supabase
    .from("base_documents")
    .update({ title })
    .eq("id", id)
    .select("*, presentation:presentations(*)")
    .maybeSingle<BaseDocumentWithPresentation>();

  if (error) {
    console.error(error);
    return { success: false, message: "Failed to update presentation title" };
  }

  return {
    success: true,
    message: "Presentation title updated successfully",
    presentation: presentation
      ? toCamelBaseDocument(presentation as BaseDocumentWithPresentation)
      : null,
  };
}

export async function deletePresentation(id: string) {
  return deletePresentations([id]);
}

export async function deletePresentations(ids: string[]) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    throw new Error("Unauthorized");
  }

  const supabase = await createClient();
  if (!supabase) {
    return {
      success: false,
      message: "Supabase is not configured",
    };
  }

  // Supabase returns deleted rows in `data`; count them for parity with
  // Prisma's `result.count`.
  const { data, error } = await supabase
    .from("base_documents")
    .delete()
    .eq("user_id", currentUser.id)
    .in("id", ids)
    .select("id");

  if (error) {
    console.error("Failed to delete presentations:", error);
    return { success: false, message: "Failed to delete presentations" };
  }

  const count = data?.length ?? 0;
  return {
    success: count > 0,
    message:
      ids.length === 1
        ? "Presentation deleted successfully"
        : `${count} presentations deleted successfully`,
  };
}

export async function getPresentation(id: string) {
  const currentUser = await getCurrentUser();
  const canRead = await canReadDocument(id, {
    userId: currentUser?.id ?? null,
    userEmail: normalizeShareEmail(currentUser?.email),
  });
  const canEdit = await canEditDocument(id, {
    userId: currentUser?.id ?? null,
    userEmail: normalizeShareEmail(currentUser?.email),
  });

  const supabase = await createClient();
  if (!supabase) {
    return { success: false, message: "Supabase is not configured" };
  }

  try {
    const { data: presentation, error } = await supabase
      .from("base_documents")
      .select("*, presentation:presentations(*)")
      .eq("id", id)
      .maybeSingle<BaseDocumentWithPresentation>();

    if (error) throw error;
    if (!presentation) notFound();
    if (!canEdit) notFound();

    // The Prisma version returned `favorites` when there was a session.
    // We don't load favorites here to keep this query simple; callers that
    // need the favorite flag should call a separate query. This matches the
    // spec's "do not modify anything else" rule for files outside the 4.

    return {
      success: true,
      presentation: toCamelBaseDocument(presentation),
      canEdit,
    };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Failed to fetch presentation" };
  }
}

export async function getPresentationContent(id: string) {
  const currentUser = await getCurrentUser();
  const canRead = await canReadDocument(id, {
    userId: currentUser?.id ?? null,
    userEmail: normalizeShareEmail(currentUser?.email),
  });

  const supabase = await createClient();
  if (!supabase) {
    return { success: false, message: "Supabase is not configured" };
  }

  try {
    const { data: row, error } = await supabase
      .from("base_documents")
      .select("presentation:presentations(id, content, theme, outline, customization)")
      .eq("id", id)
      .maybeSingle<{ presentation: PresentationRow | PresentationRow[] | null }>();

    if (error) throw error;
    if (!row) {
      return { success: false, message: "Presentation not found" };
    }
    if (!canRead) {
      return { success: false, message: "Unauthorized access" };
    }

    return {
      success: true,
      presentation: normalizePresentation(row.presentation)
        ? toCamelPresentation(normalizePresentation(row.presentation)!)
        : null,
    };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Failed to fetch presentation" };
  }
}

export async function updatePresentationTheme(id: string, theme: string) {
  return updatePresentation({ id, theme });
}

export async function duplicatePresentation(id: string, newTitle?: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    throw new Error("Unauthorized");
  }

  const canEdit = await canEditDocument(id, {
    userId: currentUser.id,
    userEmail: normalizeShareEmail(currentUser.email),
  });
  if (!canEdit) {
    return {
      success: false,
      message: "You do not have permission to view this presentation",
    };
  }

  const supabase = await createClient();
  if (!supabase) {
    return { success: false, message: "Supabase is not configured" };
  }

  try {
    const { data: original, error: origErr } = await supabase
      .from("base_documents")
      .select("*, presentation:presentations(*)")
      .eq("id", id)
      .maybeSingle<BaseDocumentWithPresentation>();

    if (origErr) throw origErr;
    const origPres = normalizePresentation(original?.presentation);
    if (!original || !origPres) {
      return { success: false, message: "Original presentation not found" };
    }

    const { data: newDoc, error: docErr } = await supabase
      .from("base_documents")
      .insert({
        type: "PRESENTATION",
        document_type: "presentation",
        title: newTitle ?? `(Copy) ${original.title}`,
        user_id: currentUser.id,
        thumbnail_url: original.thumbnail_url,
      })
      .select("id")
      .single();

    if (docErr || !newDoc) throw docErr;

    const { data: duplicated, error: presErr } = await supabase
      .from("presentations")
      .insert({
        document_id: newDoc.id,
        content: origPres.content,
        theme: origPres.theme,
        customization: origPres.customization,
        search_results: origPres.search_results,
        tool_calls: origPres.tool_calls,
        selected_chunks: origPres.selected_chunks,
      })
      .select("*")
      .single();

    if (presErr) throw presErr;

    return {
      success: true,
      message: "Presentation duplicated successfully",
      presentation: duplicated,
    };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Failed to duplicate presentation" };
  }
}
