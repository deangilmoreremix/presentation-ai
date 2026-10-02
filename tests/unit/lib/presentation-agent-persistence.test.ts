import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Persistence wiring for the presentation agent chat
 * (`public.presentation_messages`, migration 019).
 *
 * These tests exercise the two seams that the table's schema forces:
 *   1. role mapping — only `user | assistant | system` may be written;
 *   2. ownership — every row read, written, or deleted is scoped to the
 *      current Clerk id, never to the presentation id alone.
 * plus the behavioural requirement that a failed insert must not cost the
 * user their streamed answer.
 */

const CLERK_USER_ID = "user_2abcTEST";

const insertRows: Array<Record<string, unknown>> = [];
const selectFilters: Array<Array<[string, unknown]>> = [];
const deleteFilters: Array<Array<[string, unknown]>> = [];
let insertError: { message: string } | null = null;
let createClientResult: unknown = "ok";

function createFakeClient() {
  return {
    from: (table: string) => {
      if (table !== "presentation_messages") {
        throw new Error(`unexpected table ${table}`);
      }
      const deleteFiltersForTable: Array<Array<[string, unknown]>> = [];
      const builder: Record<string, unknown> = {
        delete: () => {
          deleteFilters.push(deleteFiltersForTable);
          return builder;
        },
select: () => builder,
        order: () => {
          selectFilters.push(deleteFiltersForTable);
          return Promise.resolve({ data: [], error: null });
        },
        insert: async (rows: Array<Record<string, unknown>>) => {
          insertRows.push(...rows);
          return { error: insertError };
        },
      };
      builder.eq = (column: string, value: unknown) => {
        deleteFiltersForTable.push([column, value]);
        return builder;
      };
      return builder;
    },
  };
}

vi.mock("@/env", () => ({
  env: { OPENAI_API_KEY: "sk-test", TAVILY_API_KEY: undefined },
}));

vi.mock("@/clerk/nextjs/server", () => ({
  auth: vi.fn(async () => ({ userId: CLERK_USER_ID })),
  currentUser: vi.fn(async () => ({ publicMetadata: {} })),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () =>
    createClientResult === "ok" ? createFakeClient() : null,
  ),
  getClerkUserId: vi.fn(async () => CLERK_USER_ID),
  getCurrentUser: vi.fn(async () => ({
    id: CLERK_USER_ID,
    email: null,
    role: "USER",
    hasAccess: true,
    isAdmin: false,
  })),
}));

const streamMock = vi.fn(() => ({
  async *[Symbol.asyncIterator]() {
    yield {
      type: "response.output_text.delta",
      item_id: "msg_1",
      delta: "Done.",
    };
    yield { type: "response.completed" };
  },
}));

vi.mock("openai", () => ({
  OpenAI: class {
    responses = { stream: streamMock };
  },
}));

import { POST } from "@/app/api/agent/presentation/route";
import { getPresentationMessages } from "@/app/_actions/presentation/getPresentationMessages";
import { clearPresentationChat } from "@/app/_actions/notebook/presentation/clearPresentationChat";

const PRESENTATION_ID = "3f6d1c2e-5b7a-4c9d-8e1f-2a3b4c5d6e7f";

function postRequest(body: Record<string, unknown>): Request {
  return new Request("http://localhost:3000/api/agent/presentation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function userMessage(id: string, text: string) {
  return { id, role: "user", parts: [{ type: "text", text }] };
}

beforeEach(() => {
  insertRows.length = 0;
  selectFilters.length = 0;
  deleteFilters.length = 0;
  insertError = null;
  createClientResult = "ok";
  streamMock.mockClear();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("presentation agent persistence", () => {
  it("persists the user turn and the streamed assistant turn for the caller's presentation", async () => {
    const response = await POST(
      postRequest({
        id: PRESENTATION_ID,
        messages: [userMessage("u1", "make slide 1 dark")],
      }),
    );

    expect(response.status).toBe(200);
    // Drain the stream so `execute` runs to completion.
    await response.text();

    expect(insertRows).toEqual([
      {
        presentation_id: PRESENTATION_ID,
        user_id: CLERK_USER_ID,
        role: "user",
        parts: [{ type: "text", text: "make slide 1 dark" }],
      },
      {
        presentation_id: PRESENTATION_ID,
        user_id: CLERK_USER_ID,
        role: "assistant",
        parts: [{ type: "text", text: "Done." }],
      },
    ]);
  });

  it("only persists user turns that the server has not already stored", async () => {
    const response = await POST(
      postRequest({
        id: PRESENTATION_ID,
        messages: [
          userMessage("u1", "first"),
          { id: "a1", role: "assistant", parts: [{ type: "text", text: "ok" }] },
          userMessage("u2", "second"),
        ],
      }),
    );

    await response.text();

    const userRows = insertRows.filter((row) => row.role === "user");
    expect(userRows).toHaveLength(1);
    expect(userRows[0].parts).toEqual([{ type: "text", text: "second" }]);
  });

  it("never writes a role outside the table CHECK constraint", async () => {
    const response = await POST(
      postRequest({
        id: PRESENTATION_ID,
        messages: [
          { id: "x1", role: "tool", parts: [{ type: "text", text: "nope" }] },
          { id: "x2", role: "developer", parts: [{ type: "text", text: "nope" }] },
          { id: "x3", role: null, parts: [{ type: "text", text: "nope" }] },
          userMessage("u1", "real question"),
          { id: "x4", role: "system", parts: [{ type: "text", text: "system" }] },
        ],
      }),
    );

    await response.text();

    const roles = insertRows.map((row) => row.role);
    expect(
      roles.every((role) => ["user", "assistant", "system"].includes(role as string)),
    ).toBe(true);
    expect(roles).toEqual(["user", "assistant"]);
  });

  it("skips persistence entirely when no presentation id was supplied", async () => {
    const response = await POST(
      postRequest({ messages: [userMessage("u1", "hello")] }),
    );

    await response.text();
    expect(insertRows).toEqual([]);
  });

  it("still streams the answer when the insert fails", async () => {
    insertError = { message: "connection reset" };

    const response = await POST(
      postRequest({
        id: PRESENTATION_ID,
        messages: [userMessage("u1", "make slide 1 dark")],
      }),
    );

    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toContain("text-delta");
    expect(body).not.toContain('"type":"error"');
  });

  it("still streams the answer when the Supabase client is unavailable", async () => {
    createClientResult = null;

    const response = await POST(
      postRequest({
        id: PRESENTATION_ID,
        messages: [userMessage("u1", "make slide 1 dark")],
      }),
    );

    expect(response.status).toBe(200);
    await response.text();
    expect(insertRows).toEqual([]);
  });

  it("scopes reads to the caller's own messages", async () => {
    await getPresentationMessages(PRESENTATION_ID);

    expect(selectFilters).toEqual([
      [
        ["presentation_id", PRESENTATION_ID],
        ["user_id", CLERK_USER_ID],
      ],
    ]);
  });

  it("scopes deletes to the caller's own messages", async () => {
    const result = await clearPresentationChat(PRESENTATION_ID);

    expect(result).toEqual({ success: true, message: "Presentation chat cleared" });
    expect(deleteFilters).toEqual([
      [
        ["presentation_id", PRESENTATION_ID],
        ["user_id", CLERK_USER_ID],
      ],
    ]);
  });
});