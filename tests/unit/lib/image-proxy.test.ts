import { describe, expect, it } from "vitest";

import {
  proxyPresentationImageUrl,
  resolveExportImageDataUrl,
} from "@/lib/image-proxy";

const REMOTE_IMAGE = "https://cdn.example.com/photo.jpg";

function proxied(value: string | undefined): boolean {
  return typeof value === "string" && value.includes("/api/image-proxy?url=");
}

describe("proxyPresentationImageUrl", () => {
  it("proxies generated and stock-search images", () => {
    expect(
      proxied(proxyPresentationImageUrl(REMOTE_IMAGE, { imageSource: "generate" })),
    ).toBe(true);
    expect(
      proxied(proxyPresentationImageUrl(REMOTE_IMAGE, { imageSource: "search" })),
    ).toBe(true);
  });

  it("proxies giphy images", () => {
    // Regression: the `gif` branch used to match nothing, so GIFs were handed to
    // pptxgenjs as bare remote URLs and silently dropped from exports.
    expect(
      proxied(
        proxyPresentationImageUrl("https://media.giphy.com/media/abc/giphy.gif", {
          imageSource: "gif",
        }),
      ),
    ).toBe(true);
  });

  it("does not proxy user uploads served from public storage buckets", () => {
    // `supabase/migrations/011_user_asset_storage.sql` creates the
    // `presentation-images` bucket with `public = true`, so these public object
    // URLs already answer with permissive CORS headers.
    expect(
      proxyPresentationImageUrl(
        "https://project.supabase.co/storage/v1/object/public/presentation-images/users/u1/a.png",
        { imageSource: "upload" },
      ),
    ).toBe(
      "https://project.supabase.co/storage/v1/object/public/presentation-images/users/u1/a.png",
    );
  });

  it("does not proxy embedded media, which is not an image byte stream", () => {
    expect(
      proxyPresentationImageUrl("https://www.youtube.com/watch?v=abc", {
        embedType: "youtube",
      }),
    ).toBe("https://www.youtube.com/watch?v=abc");
  });

  it("leaves data urls and already proxied urls untouched", () => {
    expect(
      proxyPresentationImageUrl("data:image/png;base64,AAA", {
        imageSource: "search",
      }),
    ).toBe("data:image/png;base64,AAA");

    const once = proxyPresentationImageUrl(REMOTE_IMAGE, {
      imageSource: "search",
    });
    expect(proxyPresentationImageUrl(once, { imageSource: "search" })).toBe(once);
  });
});

describe("resolveExportImageDataUrl", () => {
  it("passes data urls straight through", async () => {
    await expect(
      resolveExportImageDataUrl("data:image/png;base64,AAA"),
    ).resolves.toBe("data:image/png;base64,AAA");
  });

  it("inlines proxied images as data urls", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const href =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      expect(href).toContain("/api/image-proxy?url=");
      // Hand back a jsdom-realm Blob so the production `FileReader` path is
      // exercised; undici's Blob is not accepted by jsdom's FileReader.
      return {
        ok: true,
        blob: async () => new Blob([new Uint8Array([0x47, 0x49, 0x46])], {
          type: "image/gif",
        }),
      } as unknown as Response;
    }) as typeof fetch;

    try {
      await expect(
        resolveExportImageDataUrl("https://media.giphy.com/media/abc/giphy.gif", {
          imageSource: "gif",
        }),
      ).resolves.toContain("data:");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("returns null instead of throwing when the image cannot be read", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => {
      throw new Error("offline");
    }) as typeof fetch;

    try {
      await expect(
        resolveExportImageDataUrl(REMOTE_IMAGE, { imageSource: "search" }),
      ).resolves.toBeNull();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});