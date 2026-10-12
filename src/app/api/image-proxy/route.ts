import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { type NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Image proxy used by presentation export (PPTX / PDF).
 *
 * Contract with `src/lib/image-proxy.ts`:
 * - Request:  GET /api/image-proxy?url=<absolute http(s) image url>
 *             The `url` param is produced by `createImageProxyUrl`, so it is
 *             already URL-encoded by `URLSearchParams`. No other params are
 *             read by the client.
 * - Response: 200 with the raw image bytes and the upstream `Content-Type`
 *             (`resolveExportImageSource` turns the body into a data URL via
 *             `FileReader.readAsDataURL`, so the content type MUST be an
 *             `image/*` type or the resulting data URL is unusable).
 *             Anything non-200 is handled by the client as a non-fatal error
 *             (it falls back to `{ type: "path" }`).
 *
 * Only `image/*` content types are forwarded; no upstream headers, cookies or
 * authorization are echoed back.
 */

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 3;
const CACHE_CONTROL = "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800";

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);
const ALLOWED_CONTENT_TYPE_PREFIX = "image/";

const FORWARDED_REQUEST_HEADERS: Record<string, string> = {
  accept: "image/*",
  "accept-language": "en-US,en;q=0.9",
  "user-agent":
    "Mozilla/5.0 (compatible; presentation-image-proxy/1.0; +https://nextjs.org)",
};

class ProxyError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ProxyError";
    this.status = status;
  }
}

function errorResponse(error: string, status: number): NextResponse {
  return NextResponse.json(
    { error },
    {
      status,
      headers: { "cache-control": "no-store" },
    },
  );
}

function parseIpv4(value: string): number[] | null {
  const parts = value.split(".");
  if (parts.length !== 4) return null;

  const octets: number[] = [];
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const octet = Number(part);
    if (octet > 255) return null;
    octets.push(octet);
  }

  return octets;
}

function isBlockedIpv4(value: string): boolean {
  const octets = parseIpv4(value);
  if (!octets) return true;

  const [a = -1, b = -1, c = -1] = octets;

  // 0.0.0.0/8 ("this network")
  if (a === 0) return true;
  // 10.0.0.0/8
  if (a === 10) return true;
  // 100.64.0.0/10 (carrier grade NAT)
  if (a === 100 && b >= 64 && b <= 127) return true;
  // 127.0.0.0/8 (loopback)
  if (a === 127) return true;
  // 169.254.0.0/16 (link-local, includes cloud metadata at 169.254.169.254)
  if (a === 169 && b === 254) return true;
  // 172.16.0.0/12
  if (a === 172 && b >= 16 && b <= 31) return true;
  // 192.0.0.0/24 (IETF protocol assignments) and 192.0.2.0/24 (documentation)
  if (a === 192 && b === 0 && (c === 0 || c === 2)) return true;
  // 192.168.0.0/16
  if (a === 192 && b === 168) return true;
  // 198.18.0.0/15 (benchmarking)
  if (a === 198 && (b === 18 || b === 19)) return true;
  // 198.51.100.0/24 (documentation)
  if (a === 198 && b === 51 && c === 100) return true;
  // 203.0.113.0/24 (documentation)
  if (a === 203 && b === 0 && c === 113) return true;
  // 224.0.0.0/4 (multicast) and 240.0.0.0/4 (reserved, includes broadcast)
  if (a >= 224) return true;

  return false;
}

function expandIpv6(value: string): number[] | null {
  const zoneIndex = value.indexOf("%");
  const address = zoneIndex === -1 ? value : value.slice(0, zoneIndex);
  const doubleColonParts = address.split("::");
  if (doubleColonParts.length > 2) return null;

  const parseGroups = (segment: string): number[] | null => {
    if (!segment) return [];
    const groups: number[] = [];
    for (const part of segment.split(":")) {
      if (part.includes(".")) {
        const octets = parseIpv4(part);
        if (!octets) return null;
        groups.push(((octets[0] ?? 0) << 8) | (octets[1] ?? 0));
        groups.push(((octets[2] ?? 0) << 8) | (octets[3] ?? 0));
        continue;
      }
      if (!/^[0-9a-fA-F]{1,4}$/.test(part)) return null;
      groups.push(Number.parseInt(part, 16));
    }
    return groups;
  };

  const head = parseGroups(doubleColonParts[0] ?? "");
  const tail =
    doubleColonParts.length === 2 ? parseGroups(doubleColonParts[1] ?? "") : [];
  if (!head || !tail) return null;

  const missing = 8 - (head.length + tail.length);
  if (missing < 0) return null;
  if (doubleColonParts.length === 2 && missing === 0) return null;

  const groups = doubleColonParts.length === 2 ? [...head, ...new Array(missing).fill(0), ...tail] : head;
  return groups.length === 8 ? groups : null;
}

function isBlockedIpv6(value: string): boolean {
  const groups = expandIpv6(value);
  if (!groups) return true;

  const [g0 = -1, g1 = -1, g2 = -1, g3 = -1, g4 = -1, g5 = -1, g6 = -1, g7 = -1] =
    groups;

  // Unspecified (::) and loopback (::1)
  if (groups.every((group) => group === 0)) return true;
  if (groups.slice(0, 7).every((group) => group === 0) && g7 === 1) return true;

  // IPv4-mapped (::ffff:a.b.c.d) and IPv4-compatible addresses: validate the
  // embedded IPv4 address so ::ffff:127.0.0.1 cannot slip through.
  const isIpv4Mapped =
    g0 === 0 && g1 === 0 && g2 === 0 && g3 === 0 && g4 === 0 && g5 === 0xffff;
  if (isIpv4Mapped || (g0 === 0 && g1 === 0 && g2 === 0 && g3 === 0 && g4 === 0 && g5 === 0)) {
    const embedded = `${g6 >> 8}.${g6 & 0xff}.${g7 >> 8}.${g7 & 0xff}`;
    return isBlockedIpv4(embedded);
  }

  // fe80::/10 link-local
  if (g0 === 0xfe80 || (g0 & 0xffc0) === 0xfe80) return true;
  // fc00::/7 unique local
  if ((g0 & 0xfe00) === 0xfc00) return true;
  // ff00::/8 multicast
  if ((g0 & 0xff00) === 0xff00) return true;
  // 2001:db8::/32 documentation
  if (g0 === 0x2001 && g1 === 0x0db8) return true;
  // 64:ff9b::/96 NAT64 (embeds arbitrary IPv4)
  if (g0 === 0x0064 && g1 === 0xff9b) return true;
  // 100::/64 discard-only
  if (g0 === 0x0100 && g1 === 0 && g2 === 0 && g3 === 0) return true;

  return false;
}

function isBlockedAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) return isBlockedIpv4(address);
  if (family === 6) return isBlockedIpv6(address);
  return true;
}

async function assertPublicTarget(hostname: string): Promise<void> {
  // `new URL()` keeps the brackets around an IPv6 literal (`[::1]`), which
  // makes `isIP` return 0 and sends the value down the DNS path. Strip them so
  // a literal address is classified as a literal.
  const bare =
    hostname.startsWith("[") && hostname.endsWith("]")
      ? hostname.slice(1, -1)
      : hostname;

  const literalFamily = isIP(bare);
  if (literalFamily !== 0) {
    if (isBlockedAddress(bare)) {
      throw new ProxyError("Blocked address", 400);
    }
    return;
  }

  let addresses: Array<{ address: string }>;
  try {
    addresses = await lookup(bare, { all: true, verbatim: true });
  } catch {
    throw new ProxyError("Failed to resolve hostname", 502);
  }

  if (!addresses.length) {
    throw new ProxyError("Failed to resolve hostname", 502);
  }

  // Validate every resolved address (not just the first) to prevent DNS
  // rebinding, where a hostname resolves to a public and a private address.
  for (const { address } of addresses) {
    if (isBlockedAddress(address)) {
      throw new ProxyError("Blocked address", 400);
    }
  }
}

function parseTargetUrl(rawUrl: string | null): URL {
  if (!rawUrl) {
    throw new ProxyError("Missing url parameter", 400);
  }

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new ProxyError("Invalid url parameter", 400);
  }

  if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
    throw new ProxyError("Only http and https urls are supported", 400);
  }

  if (!url.hostname) {
    throw new ProxyError("Invalid url parameter", 400);
  }

  return url;
}

async function readCappedBody(
  response: Response,
): Promise<Uint8Array<ArrayBuffer>> {
  const declaredLength = response.headers.get("content-length");
  if (declaredLength) {
    const parsed = Number.parseInt(declaredLength, 10);
    if (Number.isFinite(parsed) && parsed > MAX_IMAGE_BYTES) {
      throw new ProxyError("Image exceeds maximum size", 413);
    }
  }

  const body = response.body;
  if (!body) {
    const buffer = new Uint8Array(await response.arrayBuffer());
    if (buffer.byteLength > MAX_IMAGE_BYTES) {
      throw new ProxyError("Image exceeds maximum size", 413);
    }
    return buffer;
  }

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > MAX_IMAGE_BYTES) {
        throw new ProxyError("Image exceeds maximum size", 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const merged = new Uint8Array(new ArrayBuffer(total));
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return merged;
}

async function fetchImage(
  initialUrl: URL,
): Promise<{ bytes: Uint8Array<ArrayBuffer>; contentType: string }> {
  let currentUrl = initialUrl;

  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
    await assertPublicTarget(currentUrl.hostname);

    let response: Response;
    try {
      response = await fetch(currentUrl.toString(), {
        method: "GET",
        redirect: "manual",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        headers: FORWARDED_REQUEST_HEADERS,
        cache: "no-store",
      });
    } catch (error) {
      const isTimeout =
        error instanceof Error &&
        (error.name === "TimeoutError" || error.name === "AbortError");
      throw new ProxyError(
        isTimeout ? "Upstream request timed out" : "Upstream request failed",
        isTimeout ? 504 : 502,
      );
    }

    if (
      response.status >= 300 &&
      response.status < 400 &&
      response.headers.get("location")
    ) {
      const location = response.headers.get("location");
      if (!location) break;

      let nextUrl: URL;
      try {
        nextUrl = new URL(location, currentUrl);
      } catch {
        throw new ProxyError("Invalid redirect location", 502);
      }

      if (!ALLOWED_PROTOCOLS.has(nextUrl.protocol)) {
        throw new ProxyError("Only http and https urls are supported", 400);
      }

      currentUrl = nextUrl;
      continue;
    }

    if (!response.ok) {
      throw new ProxyError(
        `Upstream responded with status ${response.status}`,
        response.status === 404 ? 404 : 502,
      );
    }

    const rawContentType = response.headers.get("content-type") ?? "";
    const contentType = rawContentType.split(";")[0]?.trim().toLowerCase() ?? "";
    if (!contentType.startsWith(ALLOWED_CONTENT_TYPE_PREFIX)) {
      throw new ProxyError("Upstream response is not an image", 415);
    }

    const bytes = await readCappedBody(response);

    if (bytes.byteLength === 0) {
      throw new ProxyError("Upstream response was empty", 502);
    }

    return { bytes, contentType };
  }

  throw new ProxyError("Too many redirects", 502);
}

export async function GET(request: NextRequest) {
  try {
    const rawUrl = request.nextUrl.searchParams.get("url");
    const target = parseTargetUrl(rawUrl);

    const { bytes, contentType } = await fetchImage(target);

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "content-type": contentType,
        "content-length": String(bytes.byteLength),
        "cache-control": CACHE_CONTROL,
        "access-control-allow-origin": "*",
        "x-content-type-options": "nosniff",
        // Hardens `image/svg+xml` payloads: the response is only ever meant to
        // be rasterized, never executed as a document.
        "content-security-policy": "default-src 'none'; sandbox",
      },
    });
  } catch (error) {
    if (error instanceof ProxyError) {
      return errorResponse(error.message, error.status);
    }

    console.error("Image proxy error:", error);
    return errorResponse("Image proxy request failed", 500);
  }
}
