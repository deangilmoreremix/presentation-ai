import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

/**
 * The `gif` image source is proxied (see `shouldProxyPresentationImage`), so the
 * proxy route has to actually accept a GIF upstream: Giphy serves
 * `image/gif` / `image/webp`, and the route allowlists `image/*`. This guards
 * against a future tightening of that allowlist silently breaking every GIF
 * export with a 415.
 */
vi.mock("node:dns/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:dns/promises")>();
  return {
    ...actual,
    default: actual,
    lookup: vi.fn(async () => [{ address: "93.184.216.34", family: 4 }]),
  };
});

import { GET } from "@/app/api/image-proxy/route";

function proxyRequest(target: string): NextRequest {
  const url = new URL("http://localhost:3000/api/image-proxy");
  url.searchParams.set("url", target);
  return new NextRequest(url);
}

describe("GET /api/image-proxy (gif upstream)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("forwards an image/gif upstream without a 415", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response(new Uint8Array([0x47, 0x49, 0x46, 0x38]), {
          status: 200,
          headers: { "content-type": "image/gif" },
        });
      }),
    );

    const response = await GET(
      proxyRequest("https://media.giphy.com/media/abc/giphy.gif"),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/gif");
    // The client fallback in `resolveExportImageSource` hands this URL to
    // pptxgenjs / html-to-image, which only work because of the ACAO header.
    expect(response.headers.get("access-control-allow-origin")).toBe("*");

    vi.unstubAllGlobals();
  });

  it("still rejects a non-image upstream with 415", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return new Response("<html></html>", {
          status: 200,
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      }),
    );

    const response = await GET(
      proxyRequest("https://www.youtube.com/watch?v=abc"),
    );

    expect(response.status).toBe(415);

    vi.unstubAllGlobals();
  });
});