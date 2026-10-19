const IMAGE_PROXY_ROUTE = "/api/image-proxy";

type PresentationImageProxyInput = {
  embedType?: string;
  imageSource?: "generate" | "search" | "gif" | "upload";
  stockImageProvider?: string;
};

/** Image provenance metadata that decides whether an image needs the proxy. */
export type ExportImageProxyInput = PresentationImageProxyInput;

type RewriteOptions = {
  absolute?: boolean;
};

type ExportImageSourceInput = PresentationImageProxyInput;

/**
 * Result of {@link resolveExportImageSource}.
 *
 * `data` is always safe to embed. A `path` is a URL that the consumer has to
 * fetch itself, and when that URL points at `/api/image-proxy` it only resolves
 * because the proxy route answers with `access-control-allow-origin: *` — see
 * the fallback in {@link resolveExportImageSource}. Consumers that cannot
 * issue a CORS-aware fetch (`html-to-image` re-fetches every resource, jsPDF
 * cannot fetch at all) should prefer {@link resolveExportImageDataUrl} so this
 * dependency disappears instead of being implicit.
 */
export type ExportImageSource =
  | {
      type: "data";
      value: string;
    }
  | {
      type: "path";
      value: string;
    };

function getCurrentOrigin(): string | null {
  return typeof window === "undefined" ? null : window.location.origin;
}

function isRemoteHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isProxiedImageUrl(value: string): boolean {
  if (value.startsWith(`${IMAGE_PROXY_ROUTE}?`)) {
    return true;
  }

  try {
    return (
      new URL(value, getCurrentOrigin() ?? "http://localhost").pathname ===
      IMAGE_PROXY_ROUTE
    );
  } catch {
    return false;
  }
}

function createImageProxyUrl(
  value: string | undefined,
  options: RewriteOptions = {},
): string | undefined {
  if (!value || !isRemoteHttpUrl(value) || isProxiedImageUrl(value)) {
    return value;
  }

  const params = new URLSearchParams({ url: value });
  const relativeUrl = `${IMAGE_PROXY_ROUTE}?${params.toString()}`;

  if (!options.absolute) {
    return relativeUrl;
  }

  const origin = getCurrentOrigin();
  return origin ? `${origin}${relativeUrl}` : relativeUrl;
}

/**
 * Decide whether a scanned image has to travel through `/api/image-proxy`.
 *
 * Exemptions (both are deliberate, both are re-verified against the actual
 * configuration rather than assumed):
 *
 * - `embedType`: an embedded media root (YouTube/Vimeo/infographic embeds)
 *   stores a *page* URL, not an image byte stream. `/api/image-proxy` only
 *   forwards `image/*` content types and answers 415 otherwise, so proxying
 *   these would convert a working embed into a hard failure.
 * - `imageSource === "upload"`: uploads are served from the public Supabase
 *   Storage bucket, whose `access-control-allow-origin: *` is exactly the
 *   condition the proxy exists to create. Routing them through the proxy would
 *   add a server round trip (and a 10 MB / 415 cliff) for no gain.
 *
 * Everything else remote is proxied: AI-generated images (`generate`), stock
 * search results (`search`), GIFs from Giphy (`gif`) and images with unknown
 * provenance all come from hosts that either send no CORS headers at all or
 * send headers that `html-to-image` / `pptxgenjs` cannot satisfy, so an
 * unproxied export either silently drops the image or aborts the whole export.
 */
function shouldProxyPresentationImage(
  url: string | undefined,
  input: PresentationImageProxyInput = {},
): boolean {
  if (!url || !isRemoteHttpUrl(url) || isProxiedImageUrl(url)) {
    return false;
  }

  return !input.embedType && input.imageSource !== "upload";
}

export function proxyPresentationImageUrl(
  url: string | undefined,
  input: PresentationImageProxyInput = {},
  options: RewriteOptions = {},
): string | undefined {
  return shouldProxyPresentationImage(url, input)
    ? createImageProxyUrl(url, options)
    : url;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Unable to convert image to data URL."));
    });
    reader.addEventListener("error", () => {
      reject(reader.error ?? new Error("Unable to read image data."));
    });
    reader.readAsDataURL(blob);
  });
}

export async function resolveExportImageSource(
  url: string,
  input: ExportImageSourceInput = {},
): Promise<ExportImageSource> {
  if (url.startsWith("data:")) {
    return { type: "data", value: url };
  }

  const proxiedUrl = proxyPresentationImageUrl(url, input, { absolute: true });
  if (!proxiedUrl || proxiedUrl === url) {
    return { type: "path", value: url };
  }

  try {
    const response = await fetch(proxiedUrl, { cache: "force-cache" });
    if (!response.ok) {
      throw new Error(
        `Image proxy request failed with status ${response.status}.`,
      );
    }

    return {
      type: "data",
      value: await blobToDataUrl(await response.blob()),
    };
  } catch (error) {
    console.warn("Failed to prepare proxied image for export:", error);
    // Falling back to the proxied absolute URL is only viable because the
    // proxy route sets `access-control-allow-origin: *`; see the
    // `ExportImageSource` doc comment. Prefer `resolveExportImageDataUrl`
    // where a CORS-aware fetch is not available.
    return { type: "path", value: proxiedUrl };
  }
}

/**
 * Resolve an image to an inline data URL, or `null` when it cannot be read.
 *
 * Use this for consumers that cannot fetch a URL themselves — jsPDF, for
 * instance, only accepts data URLs / buffers, and `html-to-image` re-fetches
 * every resource through an in-memory canvas. Both cases otherwise depend on
 * the proxy's `access-control-allow-origin: *` (or, for non-proxied URLs, on
 * the upstream happening to be CORS-friendly) to succeed at all.
 */
export async function resolveExportImageDataUrl(
  url: string,
  input: ExportImageSourceInput = {},
): Promise<string | null> {
  if (url.startsWith("data:")) {
    return url;
  }

  const source = await resolveExportImageSource(url, input);
  if (source.type === "data") {
    return source.value;
  }

  try {
    const response = await fetch(source.value, { cache: "force-cache" });
    if (!response.ok) {
      throw new Error(`Image request failed with status ${response.status}.`);
    }

    return await blobToDataUrl(await response.blob());
  } catch (error) {
    console.warn("Failed to inline export image:", error);
    return null;
  }
}

function rewriteCssUrls(value: string, options: RewriteOptions): string {
  return value.replace(
    /url\(\s*(["']?)(https?:\/\/[^"')\s]+)\1\s*\)/gi,
    (match: string, quote: string, url: string) => {
      const proxiedUrl = createImageProxyUrl(url, options);
      if (!proxiedUrl || proxiedUrl === url) {
        return match;
      }

      const nextQuote = quote || '"';
      return `url(${nextQuote}${proxiedUrl}${nextQuote})`;
    },
  );
}

function rewriteSrcSet(value: string, options: RewriteOptions): string {
  return value
    .split(",")
    .map((candidate) => {
      const trimmed = candidate.trim();
      if (!trimmed) {
        return trimmed;
      }

      const [url, ...descriptors] = trimmed.split(/\s+/);
      if (!url) {
        return trimmed;
      }

      const proxiedUrl = createImageProxyUrl(url, options) ?? url;
      return [proxiedUrl, ...descriptors].join(" ");
    })
    .join(", ");
}

export function rewriteHtmlArtifactImageUrls(
  html: string,
  options: RewriteOptions = {},
): string {
  return rewriteCssUrls(html, options)
    .replace(
      /(<(?:img|source)\b[^>]*?\s(?:src)=)(["'])(https?:\/\/[^"']+)\2/gi,
      (match: string, prefix: string, quote: string, url: string) => {
        const proxiedUrl = createImageProxyUrl(url, options);
        return proxiedUrl ? `${prefix}${quote}${proxiedUrl}${quote}` : match;
      },
    )
    .replace(
      /(<(?:img|source)\b[^>]*?\s(?:srcset)=)(["'])([^"']+)\2/gi,
      (match: string, prefix: string, quote: string, srcset: string) => {
        const rewrittenSrcset = rewriteSrcSet(srcset, options);
        return rewrittenSrcset === srcset
          ? match
          : `${prefix}${quote}${rewrittenSrcset}${quote}`;
      },
    );
}
