import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

/**
 * BYOK client error-contract tests.
 *
 * These pin the contract between the server's structured 402 / action result
 * and the client's decision to open the API key modal — including the rule
 * that unrelated failures must never open the modal.
 */

let registeredHandler: ((provider: string) => void) | null = null;
const modalOpens: string[] = [];

vi.mock("@/lib/ai/provider-credentials", () => ({
  ProviderKeyRequiredError: class extends Error {
    code = "PROVIDER_KEY_REQUIRED";
    provider: string;
    constructor(provider: string, message?: string) {
      super(message ?? "missing key");
      this.provider = provider;
    }
  },
}));

import {
  PROVIDER_KEY_REQUIRED,
  byokErrorFromResult,
  byokFetch,
  byokProviderFromError,
  notifyByokError,
  parseByokError,
  registerByokHandler,
} from "@/lib/ai/byok-client";

const fetchMock = vi.fn();
globalThis.fetch = fetchMock as unknown as typeof fetch;

beforeEach(() => {
  vi.clearAllMocks();
  modalOpens.length = 0;
  registeredHandler?.constructor;
  // Install a handler that records which provider was requested.
  const unregister = registerByokHandler((provider) => {
    modalOpens.push(provider);
  });
  // keep a reference so we can remove it after each test
  (globalThis as unknown as { __unregister: () => void }).__unregister =
    unregister;
});

afterEach(() => {
  (
    globalThis as unknown as { __unregister: () => void }
  ).__unregister?.();
});

describe("parseByokError", () => {
  it("extracts the provider from a structured route payload", () => {
    expect(
      parseByokError({
        code: PROVIDER_KEY_REQUIRED,
        provider: "muapi",
        error: "…",
      }),
    ).toBe("muapi");
  });

  it("defaults to openai when the provider is absent", () => {
    expect(parseByokError({ code: PROVIDER_KEY_REQUIRED })).toBe("openai");
  });

  it("returns null for unrelated payloads", () => {
    expect(parseByokError({ code: "RATE_LIMIT", provider: "openai" })).toBeNull();
    expect(parseByokError({ error: "boom" })).toBeNull();
    expect(parseByokError(null)).toBeNull();
    expect(parseByokError("PROVIDER_KEY_REQUIRED")).toBeNull();
    expect(parseByokError({ code: PROVIDER_KEY_REQUIRED, provider: 42 })).toBe(
      "openai",
    );
  });
});

describe("byokErrorFromResult (server actions)", () => {
  it("detects a BYOK failure on a failed action result", () => {
    expect(
      byokErrorFromResult({
        success: false,
        error: "No key configured",
        code: PROVIDER_KEY_REQUIRED,
        provider: "openai",
      }),
    ).toBe("openai");
  });

  it("returns null when the action succeeded", () => {
    expect(byokErrorFromResult({ success: true })).toBeNull();
  });

  it("returns null for an unrelated action failure", () => {
    expect(
      byokErrorFromResult({ success: false, error: "rate limited" }),
    ).toBeNull();
  });
});

describe("byokProviderFromError (thrown errors)", () => {
  it("detects a typed BYOK error", () => {
    expect(
      byokProviderFromError({
        code: PROVIDER_KEY_REQUIRED,
        provider: "muapi",
      }),
    ).toBe("muapi");
  });

  it("parses the JSON body embedded in an error message", () => {
    // The AI SDK transports serialize non-2xx bodies into the message.
    const message = JSON.stringify({
      code: PROVIDER_KEY_REQUIRED,
      provider: "openai",
      error: "No OpenAI API key is configured.",
    });
    expect(byokProviderFromError(new Error(message))).toBe("openai");
  });

  it("defaults to openai when the message mentions the code but has no JSON", () => {
    expect(
      byokProviderFromError(new Error("PROVIDER_KEY_REQUIRED")),
    ).toBe("openai");
  });

  it("returns null for unrelated errors", () => {
    expect(byokProviderFromError(new Error("network error"))).toBeNull();
    expect(byokProviderFromError(null)).toBeNull();
  });
});

describe("notifyByokError", () => {
  it("opens the modal for the requested provider", () => {
    notifyByokError("muapi");
    expect(modalOpens).toEqual(["muapi"]);
  });

  it("defaults to openai", () => {
    notifyByokError();
    expect(modalOpens).toEqual(["openai"]);
  });

  it("is a no-op after the handler is unregistered", () => {
    (
      globalThis as unknown as { __unregister: () => void }
    ).__unregister();
    notifyByokError("openai");
    expect(modalOpens).toEqual([]);
  });
});

describe("byokFetch", () => {
  function jsonResponse(status: number, body: unknown): Response {
    return new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    });
  }

  it("opens the modal on a 402 BYOK failure", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(402, {
        code: PROVIDER_KEY_REQUIRED,
        provider: "openai",
        error: "No OpenAI API key is configured.",
      }),
    );

    await byokFetch("/api/presentation/generate", { method: "POST" });
    expect(modalOpens).toEqual(["openai"]);
  });

  it("returns the original response so normal error handling still works", async () => {
    const response = jsonResponse(402, {
      code: PROVIDER_KEY_REQUIRED,
      provider: "openai",
    });
    fetchMock.mockResolvedValue(response);

    const received = await byokFetch("/api/presentation/outline");
    expect(received).toBe(response);
    expect(received.status).toBe(402);
  });

  it("does not consume or clone a successful stream", async () => {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("data: {}"));
        controller.close();
      },
    });
    const response = new Response(stream, {
      status: 200,
      headers: { "content-type": "text/event-stream" },
    });
    fetchMock.mockResolvedValue(response);

    const received = await byokFetch("/api/presentation/generate");
    expect(received).toBe(response);
    expect(modalOpens).toEqual([]);

    // The body must still be readable by the caller.
    const text = await received.text();
    expect(text).toContain("data:");
  });

  it("does not open the modal for unrelated failures", async () => {
    for (const status of [400, 429, 500]) {
      fetchMock.mockResolvedValue(
        jsonResponse(status, { error: "something else" }),
      );
      await byokFetch("/api/image/generate");
      expect(modalOpens).toEqual([]);
    }
  });

  it("does not open the modal for a non-JSON 402", async () => {
    fetchMock.mockResolvedValue(
      new Response("Forbidden", { status: 402, headers: { "content-type": "text/plain" } }),
    );
    await byokFetch("/api/presentation/generate");
    expect(modalOpens).toEqual([]);
  });

  it("survives a malformed JSON body without throwing", async () => {
    fetchMock.mockResolvedValue(
      new Response("not json", {
        status: 402,
        headers: { "content-type": "application/json" },
      }),
    );
    await expect(
      byokFetch("/api/presentation/generate"),
    ).resolves.toBeDefined();
    expect(modalOpens).toEqual([]);
  });
});
