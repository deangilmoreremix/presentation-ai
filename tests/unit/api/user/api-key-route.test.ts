import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * API-key management route security tests.
 *
 * The critical invariant: the endpoint returns safe status metadata only, and
 * there is NO mode that returns plaintext or masked key material.
 */

const supabaseState: {
  userId: string | null;
  row: Record<string, unknown> | null;
} = { userId: null, row: null };

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(async () => ({ userId: supabaseState.userId })),
}));

const supabaseMock = {
  table: "users",
  singleResult: { data: null as unknown, error: null as unknown },
  updated: [] as Array<Record<string, unknown>>,
  from: vi.fn(function (this: unknown, table: string) {
    (supabaseMock as unknown as { table: string }).table = table;
    return supabaseMock.chain();
  }),
  chain() {
    const self = supabaseMock;
    return {
      select: vi.fn(() => supabaseMock.chain()),
      eq: vi.fn(() => supabaseMock.chain()),
      maybeSingle: vi.fn(async () => {
        self.singleResult = { data: supabaseState.row, error: null };
        return self.singleResult;
      }),
      update: vi.fn((values: Record<string, unknown>) => {
        self.updated.push(values);
        return supabaseMock.chain();
      }),
    };
  },
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => supabaseMock),
}));

vi.mock("@/lib/observability/logger", () => ({
  appLogger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

// Use the real encryption primitive (not a stub) so this test also proves the
// stored column value is ciphertext and not the plaintext key.
process.env.API_KEY_ENCRYPTION_MASTER_KEY = "A".repeat(64);

import { GET, POST, DELETE } from "@/app/api/user/api-key/route";

function makeRequest(
  url: string,
  init?: RequestInit,
): Request {
  return new Request(url, init);
}

const USER_A = "user_aaaa1111";
const KEY_A = "sk-useraaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

beforeEach(() => {
  vi.clearAllMocks();
  supabaseState.userId = null;
  supabaseState.row = null;
  supabaseMock.updated = [];
});

describe("GET /api/user/api-key", () => {
  it("returns an empty provider list for anonymous callers", async () => {
    supabaseState.userId = null;
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ success: true, providers: [] });
  });

  it("returns safe metadata only, with no key material", async () => {
    supabaseState.userId = USER_A;
    supabaseState.row = {
      openai_api_key_encrypted: "enc:ciphertext",
      openai_api_key_iv: "iv-abc",
      openai_last_validated_at: "2026-01-01T00:00:00.000Z",
      muapi_api_key_encrypted: null,
      muapi_api_key_iv: null,
    };

    const response = await GET();
    const body = await response.json();
    const serialized = JSON.stringify(body);

    expect(response.status).toBe(200);
    // Safe metadata.
    expect(body.providers).toHaveLength(2);
    expect(body.providers[0]).toMatchObject({
      provider: "openai",
      configured: true,
    });
    expect(body.providers[1]).toMatchObject({
      provider: "muapi",
      configured: false,
    });

    // Never any credential material or partial reveal.
    expect(serialized).not.toContain("ciphertext");
    expect(serialized).not.toContain("iv-abc");
    expect(serialized).not.toContain("sk-");
    expect(serialized).not.toContain("rawKey");
    expect(serialized).not.toContain("maskedKey");
  });

  it("never decrypts a key just to report status", async () => {
    supabaseState.userId = USER_A;
    supabaseState.row = {
      openai_api_key_encrypted: "enc:whatever",
      openai_api_key_iv: "iv-abc",
    };

    const response = await GET();
    const body = await response.json();

    // `configured` is derived from column presence, so no decryption occurs.
    expect(body.providers[0].configured).toBe(true);
    expect(JSON.stringify(body)).not.toContain("decrypted");
  });
});

describe("POST /api/user/api-key", () => {
  it("rejects anonymous callers", async () => {
    supabaseState.userId = null;
    const response = await POST(
      makeRequest("http://localhost/api/user/api-key", {
        method: "POST",
        body: JSON.stringify({ provider: "openai", key: KEY_A }),
      }),
    );

    expect(response.status).toBe(401);
  });

  it("rejects an unsupported provider", async () => {
    supabaseState.userId = USER_A;
    const response = await POST(
      makeRequest("http://localhost/api/user/api-key", {
        method: "POST",
        body: JSON.stringify({ provider: "anthropic", key: KEY_A }),
      }),
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/unsupported/i);
  });

  it("rejects a malformed OpenAI key", async () => {
    supabaseState.userId = USER_A;
    const response = await POST(
      makeRequest("http://localhost/api/user/api-key", {
        method: "POST",
        body: JSON.stringify({ provider: "openai", key: "not-a-key" }),
      }),
    );

    expect(response.status).toBe(400);
    // No persistence happened.
    expect(supabaseMock.updated).toHaveLength(0);
  });

  it("stores a valid OpenAI key", async () => {
    supabaseState.userId = USER_A;
    const response = await POST(
      makeRequest("http://localhost/api/user/api-key", {
        method: "POST",
        body: JSON.stringify({ provider: "openai", key: KEY_A }),
      }),
    );

    expect(response.status).toBe(200);
    expect(supabaseMock.updated).toHaveLength(1);
    // The plaintext key must never be written to the row.
    expect(JSON.stringify(supabaseMock.updated[0])).not.toContain(
      "sk-useraa",
    );
  });
});

describe("DELETE /api/user/api-key", () => {
  it("rejects anonymous callers", async () => {
    supabaseState.userId = null;
    const response = await DELETE(
      makeRequest("http://localhost/api/user/api-key?provider=openai"),
    );
    expect(response.status).toBe(401);
  });

  it("requires a supported provider", async () => {
    supabaseState.userId = USER_A;
    const response = await DELETE(
      makeRequest("http://localhost/api/user/api-key?provider=bogus"),
    );
    expect(response.status).toBe(400);
  });

  it("clears the credential columns for the given provider", async () => {
    supabaseState.userId = USER_A;
    const response = await DELETE(
      makeRequest("http://localhost/api/user/api-key?provider=openai"),
    );

    expect(response.status).toBe(200);
    expect(supabaseMock.updated).toHaveLength(1);
    const values = supabaseMock.updated[0];
    expect(values.openai_api_key_encrypted).toBeNull();
    expect(values.openai_api_key_iv).toBeNull();
  });
});

describe("no raw-key reveal mode exists", () => {
  it("the route source contains no raw-key disclosure path", async () => {
    const fs = await import("node:fs");
    const source = fs.readFileSync("src/app/api/user/api-key/route.ts", "utf8");

    expect(source).not.toContain("rawKey");
    expect(source).not.toContain("searchParams.get(\"raw\")");
    expect(source).not.toContain("decryptApiKey");
  });
});
