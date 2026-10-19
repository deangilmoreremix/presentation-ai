import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Regression tests for the presentation document identity contract.
 *
 * presentations.id is a surrogate primary key, but every other access path in
 * the app keys on base_documents.id: the /presentation/[id] page,
 * updatePresentation, updatePresentationTitle, deletePresentation, and the
 * document list. Returning the surrogate from create/duplicate made those
 * flows navigate to an id that does not exist, so they 404'd.
 */

const DOCUMENT_ID = "doc-uuid-1111";
const SURROGATE_ID = "surrogate-uuid-9999";

const state = {
  userId: null as string | null,
  documents: [] as Array<Record<string, unknown>>,
  presentationRows: [] as Array<Record<string, unknown>>,
  lastInsert: null as Record<string, unknown> | null,
  /** Value passed to the most recent `.eq()` call. */
  lastEq: null as string | null,
};

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(async () => ({ userId: state.userId })),
}));

vi.mock("@/lib/supabase/server", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/lib/supabase/server")>();

  const buildChain = (table: string) => {
    const chain: Record<string, unknown> = {};

    chain.select = () => chain;
    chain.eq = (_column: string, value: string) => {
      state.lastEq = value;
      return chain;
    };
    chain.insert = (values: Record<string, unknown>) => {
      state.lastInsert = values;
      return chain;
    };
    chain.update = () => chain;
    chain.maybeSingle = async () => {
      // `duplicatePresentation` reads the source document + its presentation.
      if (table !== "base_documents") return { data: null, error: null };

      const original = state.documents.find((d) => d.id === state.lastEq);
      if (!original) return { data: null, error: null };

      const presentation = state.presentationRows.find(
        (p) => p.document_id === state.lastEq,
      );

      return { data: { ...original, presentation }, error: null };
    };
    chain.single = async () => {
      const isDocument = table === "base_documents";
      const injected = isDocument
        ? { id: DOCUMENT_ID }
        : { id: SURROGATE_ID, document_id: DOCUMENT_ID };

      const row = {
        ...((state.lastInsert ?? {}) as object),
        ...injected,
      } as Record<string, unknown>;

      if (isDocument) {
        state.documents.push(row);
      } else {
        state.presentationRows.push(row);
      }

      return { data: row, error: null };
    };

    return chain;
  };

  return {
    ...original,
    createClient: async () => ({ from: (table: string) => buildChain(table) }),
  };
});

vi.mock("@/server/share/authorization", () => ({
  canEditDocument: vi.fn(async () => true),
  getDocumentAccessForUser: vi.fn(async () => ({
    canRead: true,
    canEdit: true,
  })),
  getSessionIdentity: vi.fn(async () => ({
    userId: "user_abc",
    userEmail: "user@example.com",
  })),
}));

import {
  createPresentation,
  duplicatePresentation,
} from "@/app/_actions/notebook/presentation/presentationActions";

const USER = "user_abc";

beforeEach(() => {
  vi.clearAllMocks();
  state.userId = USER;
  state.documents = [];
  state.presentationRows = [];
  state.lastInsert = null;
  state.lastEq = null;
});

describe("createPresentation", () => {
  it("returns the base document id, not the presentations surrogate id", async () => {
    const result = await createPresentation({
      content: { slides: [] },
      title: "My deck",
    });

    expect(result.success).toBe(true);
    expect(result.presentation?.id).toBe(DOCUMENT_ID);
    expect(result.presentation?.id).not.toBe(SURROGATE_ID);
  });
});

describe("duplicatePresentation", () => {
  it("returns the new base document id, not the presentations surrogate id", async () => {
    state.documents = [
      {
        id: "doc-source",
        user_id: USER,
        type: "PRESENTATION",
        title: "Source",
      },
    ];
    state.presentationRows = [
      {
        id: "surrogate-source",
        document_id: "doc-source",
        content: { slides: [] },
        theme: "mystique",
        customization: null,
        search_results: null,
        tool_calls: null,
        selected_chunks: null,
        editor_mode: "flow",
      },
    ];

    const result = await duplicatePresentation("doc-source");

    expect(result.success).toBe(true);
    expect(result.presentation?.id).toBe(DOCUMENT_ID);
    expect(result.presentation?.id).not.toBe("surrogate-source");
  });
});

describe("document identity invariant", () => {
  it("the id returned by create is never a presentations row id", async () => {
    const result = await createPresentation({
      content: { slides: [] },
      title: "Invariant check",
    });

    const returnedId = result.presentation?.id;
    const surrogateIds = state.presentationRows.map((row) => row.id);

    expect(returnedId).toBeTruthy();
    expect(surrogateIds).toContain(SURROGATE_ID);
    expect(surrogateIds).not.toContain(returnedId);
  });
});
