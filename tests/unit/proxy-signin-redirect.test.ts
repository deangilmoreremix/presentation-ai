import { describe, expect, it, vi } from "vitest";

import { type NextRequest, NextResponse } from "next/server";

vi.mock("@clerk/nextjs/server", () => ({
  clerkMiddleware: (handler: unknown) => handler,
  createRouteMatcher: () => () => false,
  auth: async () => ({ userId: null }),
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: async () => ({ success: true, resetIn: 0 }),
}));

const { default: proxy } = await import("@/proxy");

/** Builds a request the middleware can read the nextUrl from. */
function makeRequest(pathname: string): NextRequest {
  const url = new URL(`https://presentations.example.com${pathname}`);
  return {
    nextUrl: url,
    url: url.toString(),
    headers: new Headers(),
  } as unknown as NextRequest;
}

describe("proxy sign-in redirect", () => {
  it("carries the requested path as callbackUrl, which is what the sign-in page reads", async () => {
    const response = (await proxy(async () => ({ userId: null }), makeRequest("/image-studio"))) as Response;

    expect(response).toBeInstanceOf(NextResponse);
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://presentations.example.com/auth/signin?callbackUrl=%2Fimage-studio",
    );
  });

  it("preserves a nested presentation path so the user returns to the same slide", async () => {
    const response = (await proxy(async () => ({ userId: null }), makeRequest("/presentation/abc123"))) as Response;

    expect(response.status).toBe(307);
    const location = new URL(response.headers.get("location") ?? "");
    expect(location.pathname).toBe("/auth/signin");
    expect(location.searchParams.get("callbackUrl")).toBe("/presentation/abc123");
    // The old `redirect` parameter is what the page ignored; it must be gone.
    expect(location.searchParams.has("redirect")).toBe(false);
  });
});
