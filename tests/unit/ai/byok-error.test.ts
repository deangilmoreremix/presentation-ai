import { describe, it, expect } from "vitest";
import { NextResponse } from "next/server";
import { byokErrorResponse } from "@/lib/ai/byok-error";
import {
  PROVIDER_KEY_REQUIRED,
  ProviderKeyRequiredError,
} from "@/lib/ai/provider-credentials";

describe("byokErrorResponse", () => {
  it("maps a typed ProviderKeyRequiredError to a 402 with a stable code", () => {
    const error = new ProviderKeyRequiredError("openai");

    const response = byokErrorResponse(error);

    expect(response).not.toBeNull();
    expect((response as NextResponse).status).toBe(402);
    return (response as NextResponse).json().then((body) => {
      expect(body.code).toBe(PROVIDER_KEY_REQUIRED);
      expect(body.provider).toBe("openai");
      expect(typeof body.error).toBe("string");
    });
  });

  it("names the correct provider for MuAPI", () => {
    const response = byokErrorResponse(new ProviderKeyRequiredError("muapi"));

    expect(response).not.toBeNull();
    return (response as NextResponse).json().then((body) => {
      expect(body.provider).toBe("muapi");
    });
  });

  it("never leaks the platform owner's credentials in the payload", async () => {
    const response = byokErrorResponse(new ProviderKeyRequiredError("openai"));
    const body = await (response as NextResponse).json();
    const serialized = JSON.stringify(body);

    expect(serialized).not.toContain("sk-");
    expect(serialized).not.toContain("OPENAI_API_KEY");
    // The message must instruct the user to supply their own key.
    expect(body.error).toMatch(/your own api key/i);
  });

  it("returns null for unrelated errors so existing handling still runs", () => {
    expect(byokErrorResponse(new Error("boom"))).toBeNull();
    expect(byokErrorResponse(new TypeError("x"))).toBeNull();
    expect(byokErrorResponse(null)).toBeNull();
    expect(byokErrorResponse(undefined)).toBeNull();
  });

  it("also matches duck-typed failures raised before construction", () => {
    const duck = new Error("provider key required") as Error & {
      code: string;
      provider: string;
    };
    duck.code = PROVIDER_KEY_REQUIRED;
    duck.provider = "muapi";

    const response = byokErrorResponse(duck);
    expect(response).not.toBeNull();
    return (response as NextResponse).json().then((body) => {
      expect(body.code).toBe(PROVIDER_KEY_REQUIRED);
      expect(body.provider).toBe("muapi");
    });
  });

  it("defaults the provider to openai for a duck-typed error without one", async () => {
    const duck = new Error("provider key required") as Error & { code: string };
    duck.code = PROVIDER_KEY_REQUIRED;

    const response = byokErrorResponse(duck);
    const body = await (response as NextResponse).json();
    expect(body.provider).toBe("openai");
  });
});

describe("ProviderKeyRequiredError", () => {
  it("carries a machine-readable code and provider", () => {
    const error = new ProviderKeyRequiredError("openai");
    expect(error.code).toBe(PROVIDER_KEY_REQUIRED);
    expect(error.provider).toBe("openai");
    expect(error).toBeInstanceOf(Error);
  });

  it("defaults to a user-facing BYOK message", () => {
    expect(new ProviderKeyRequiredError("openai").message).toMatch(
      /your own api key/i,
    );
  });
});
