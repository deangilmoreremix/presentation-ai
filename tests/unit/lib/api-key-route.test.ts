import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(async () => ({ userId: "user-1" })),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    from: () => ({
      update: () => ({ eq: async () => ({ error: null }) }),
    }),
  })),
}));

vi.mock("@/lib/observability/logger", () => ({
  appLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { POST } from "@/app/api/user/api-key/route";

const validKey = `sk-${"a".repeat(32)}`;

function postRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/user/api-key", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/user/api-key", () => {
  let originalEnv: string | undefined;

  beforeEach(() => {
    originalEnv = process.env.API_KEY_ENCRYPTION_MASTER_KEY;
    delete process.env.API_KEY_ENCRYPTION_MASTER_KEY;
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.API_KEY_ENCRYPTION_MASTER_KEY;
    } else {
      process.env.API_KEY_ENCRYPTION_MASTER_KEY = originalEnv;
    }
  });

  it("returns 503 with actionable guidance when the master key is not configured", async () => {
    const response = await POST(postRequest({ key: validKey, storage: "server" }));

    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.code).toBe("MASTER_KEY_NOT_CONFIGURED");
    expect(body.error).toContain("API_KEY_ENCRYPTION_MASTER_KEY");
    expect(body.error).toContain("randomBytes(32)");
    expect(body.error).not.toContain(process.env.API_KEY_ENCRYPTION_MASTER_KEY ?? "\u0000");
  });

  it("returns 503 with actionable guidance when the master key has the wrong length", async () => {
    process.env.API_KEY_ENCRYPTION_MASTER_KEY = Buffer.alloc(16).toString("base64");

    const response = await POST(postRequest({ key: validKey, storage: "server" }));

    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.error).toContain("API_KEY_ENCRYPTION_MASTER_KEY");
  });

  it("succeeds for server storage when the master key is valid", async () => {
    process.env.API_KEY_ENCRYPTION_MASTER_KEY = Buffer.alloc(32, 7).toString("base64");

    const response = await POST(postRequest({ key: validKey, storage: "server" }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
  });

  it("does not require the master key for client storage", async () => {
    const response = await POST(postRequest({ key: validKey, storage: "client" }));

    expect(response.status).toBe(200);
  });
});
