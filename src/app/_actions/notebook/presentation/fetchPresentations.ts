"use server";

import "server-only";

import { auth } from "@clerk/nextjs/server";
import { logger } from "@/lib/observability/server/logger";
import { createClient } from "@/lib/supabase/server";

const ITEMS_PER_PAGE = 10;
// In Prisma, `DocumentType.PRESENTATION === "PRESENTATION"`. We keep the
// string value stable in Supabase so existing rows match.
const PRESENTATION_DOCUMENT_TYPE = "PRESENTATION" as const;
export type PresentationDocumentTypeFilter = typeof PRESENTATION_DOCUMENT_TYPE;

type PresentationRow = {
  id: string;
  title: string;
  type: string;
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
  is_public: boolean;
  user_id: string;
};

type PresentationContentRow = {
  content: unknown;
};

type FavoriteRow = {
  id: string;
  user_id: string;
  document_id: string;
};

type PresentationContentShape = {
  slides?: unknown;
};

function hasSlideContent(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const content = value as PresentationContentShape;
  return Array.isArray(content.slides) && content.slides.length > 0;
}

export async function fetchPresentations(
  page = 0,
  type: PresentationDocumentTypeFilter = PRESENTATION_DOCUMENT_TYPE,
  options?: { favoritesOnly?: boolean },
) {
  const actionName = "presentation.fetchPresentations.fetchPresentations";
  const span = logger.startSpan(`notebook.server_action.${actionName}`, {
    attributes: {
      "smart.scope": "notebook",
      "smart.action.type": "server_action",
      "smart.action.name": actionName,
    },
  });

  try {
    const { userId } = await auth();

    const supabase = await createClient();
    if (!supabase) {
      return { items: [], hasMore: false };
    }

    const skip = page * ITEMS_PER_PAGE;

    if (options?.favoritesOnly) {
      if (!userId) {
        return { items: [], hasMore: false };
      }

      const { data: favRows, error: favErr } = await supabase
        .from("favorite_documents")
        .select("document_id")
        .eq("user_id", userId);

      if (favErr) throw favErr;

      const ids = (favRows ?? []).map((r: Pick<FavoriteRow, "document_id">) => r.document_id);
      if (ids.length === 0) {
        return { items: [], hasMore: false };
      }

      const { data: docs, error: docsErr } = await supabase
        .from("base_documents")
        .select(
          "id, title, type, thumbnail_url, created_at, updated_at, is_public, user_id, presentation:presentations(content)",
        )
        .eq("type", type)
        .in("id", ids)
        .order("updated_at", { ascending: false })
        .range(skip, skip + ITEMS_PER_PAGE);

      if (docsErr) throw docsErr;

      return shapeResult(docs ?? [], ITEMS_PER_PAGE);
    }

    const baseQuery = supabase
      .from("base_documents")
      .select(
        "id, title, type, thumbnail_url, created_at, updated_at, is_public, user_id, presentation:presentations(content)",
      )
      .eq("type", type)
      .order("updated_at", { ascending: false })
      .range(skip, skip + ITEMS_PER_PAGE);

    const query = userId ? baseQuery.eq("user_id", userId) : baseQuery;
    const { data: rows, error } = await query;

    if (error) throw error;

    return shapeResult(rows ?? [], ITEMS_PER_PAGE);
  } catch (error) {
    span.error(error);
    throw error;
  } finally {
    span.end();
  }
}

type BaseDocumentWithPresentation = PresentationRow & {
  presentation: PresentationContentRow | PresentationContentRow[] | null;
};

function shapeResult(rows: BaseDocumentWithPresentation[], perPage: number) {
  const hasMore = rows.length > perPage;
  const items = (hasMore ? rows.slice(0, perPage) : rows).map((item) => {
    // `presentation` is a one-to-one via FK on `presentations.document_id`,
    // but Supabase returns it as an object or array depending on the
    // relationship. Normalize to a single object.
    const pres = Array.isArray(item.presentation)
      ? item.presentation[0]
      : item.presentation;
    const content = (pres?.content ?? null) as unknown;

    return {
      id: item.id,
      title: item.title,
      type: item.type,
      thumbnailUrl: item.thumbnail_url,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      isOwnedByCurrentUser: true,
      favorites: [] as { id: string }[],
      hasSlides: hasSlideContent(content),
      hasContent: hasSlideContent(content),
    };
  });

  return { items, hasMore };
}
