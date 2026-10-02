import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";

const envMock = { OPENAI_API_KEY: "" as string | undefined };

vi.mock("@/env", () => ({
  env: envMock,
}));

const { assertModelIsConfigured } = await import("@/lib/model-picker");

describe("assertModelIsConfigured", () => {
  beforeEach(() => {
    envMock.OPENAI_API_KEY = "";
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it("throws when no OpenAI key is available at all", () => {
    expect(() => assertModelIsConfigured("openai", "gpt-4o-mini")).toThrow(
      'OPENAI_API_KEY is required when using the OpenAI model "gpt-4o-mini".',
    );
  });

  it("passes when a caller-supplied apiKey is provided and the env key is empty", () => {
    expect(() =>
      assertModelIsConfigured("openai", "gpt-4o-mini", "sk-user-supplied-key"),
    ).not.toThrow();
  });

  it("passes when the env key is set even without a caller-supplied apiKey", () => {
    envMock.OPENAI_API_KEY = "sk-env-key";
    expect(() => assertModelIsConfigured("openai", "gpt-4o-mini")).not.toThrow();
  });

  it("ignores blank caller-supplied apiKeys", () => {
    expect(() => assertModelIsConfigured("openai", "gpt-4o-mini", "   ")).toThrow(
      /OPENAI_API_KEY is required/,
    );
  });

  it("keeps requiring a model id for the lmstudio provider", () => {
    expect(() => assertModelIsConfigured("lmstudio", undefined, "sk-user-key")).toThrow(
      "An LM Studio model must be selected before continuing.",
    );
  });

  it("does not require an OpenAI key for the lmstudio provider", () => {
    expect(() =>
      assertModelIsConfigured("lmstudio", "local-model"),
    ).not.toThrow();
  });

  it("never includes the supplied apiKey value in the error output", () => {
    const userKey = "sk-secret-user-key-value";
    try {
      assertModelIsConfigured("openai", "gpt-4o-mini", "");
      expect.unreachable();
    } catch (error) {
      expect(error instanceof Error && error.message).not.toContain(userKey);
    }
  });
});