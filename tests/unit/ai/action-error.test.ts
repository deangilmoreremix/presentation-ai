import { describe, it, expect } from "vitest";
import { toActionErrorResult } from "@/lib/ai/action-error";
import {
  PROVIDER_KEY_REQUIRED,
  ProviderKeyRequiredError,
} from "@/lib/ai/provider-credentials";

/**
 * Server-action error normalization.
 *
 * A missing BYOK credential must reach the client as a structured result so it
 * can open the API key modal, without leaking any credential material.
 */
describe("toActionErrorResult", () => {
  it("normalizes a typed BYOK failure", () => {
    const result = toActionErrorResult(
      new ProviderKeyRequiredError("muapi"),
      "Failed",
    );

    expect(result.success).toBe(false);
    expect(result.code).toBe(PROVIDER_KEY_REQUIRED);
    expect(result.provider).toBe("muapi");
    expect(result.error).toMatch(/your own api key/i);
    // Never any credential material.
    expect(result.error).not.toContain("sk-");
  });

  it("normalizes a duck-typed BYOK failure", () => {
    const error = new Error("provider key required") as Error & {
      code: string;
      provider: string;
    };
    error.code = PROVIDER_KEY_REQUIRED;
    error.provider = "openai";

    const result = toActionErrorResult(error, "Failed");
    expect(result).toEqual({
      success: false,
      error: "provider key required",
      code: PROVIDER_KEY_REQUIRED,
      provider: "openai",
    });
  });

  it("defaults a duck-typed provider to openai", () => {
    const error = new Error("x") as Error & { code: string };
    error.code = PROVIDER_KEY_REQUIRED;

    const result = toActionErrorResult(error, "Failed");
    expect(result.provider).toBe("openai");
  });

  it("passes unrelated errors through with the fallback message", () => {
    const result = toActionErrorResult(new Error("rate limit"), "Fallback text");
    expect(result).toEqual({
      success: false,
      error: "rate limit",
    });
    expect(result.code).toBeUndefined();
  });

  it("handles non-Error throws", () => {
    const result = toActionErrorResult("boom", "Fallback text");
    expect(result).toEqual({ success: false, error: "Fallback text" });
  });

  it("never carries a provider for unrelated errors", () => {
    const result = toActionErrorResult(new TypeError("x"), "Fallback");
    expect(result.provider).toBeUndefined();
    expect(result.code).toBeUndefined();
  });
});
