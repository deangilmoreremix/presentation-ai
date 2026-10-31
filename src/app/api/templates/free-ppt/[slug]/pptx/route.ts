import { NextResponse } from "next/server";

import {
  getFreePptPptxUrl,
  loadFreePptTemplates,
} from "@/lib/presentation/free-ppt-templates";

const MAX_BYTES = 40 * 1024 * 1024;

/**
 * Same-origin proxy for a catalog template's .pptx. cdn.ppttemplate.ai sends
 * no CORS headers, so the browser can't read the file directly to extract its
 * theme. Only slugs from the bundled catalog are served.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const template = (await loadFreePptTemplates()).find((t) => t.slug === slug);
  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  const upstream = await fetch(getFreePptPptxUrl(template), {
    signal: AbortSignal.timeout(20_000),
  }).catch(() => null);
  if (!upstream?.ok || !upstream.body) {
    return NextResponse.json({ error: "Template download failed" }, { status: 502 });
  }
  const length = Number(upstream.headers.get("content-length") ?? 0);
  if (length > MAX_BYTES) {
    return NextResponse.json({ error: "Template too large" }, { status: 413 });
  }

  return new NextResponse(upstream.body, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      ...(length ? { "Content-Length": String(length) } : {}),
      "Cache-Control": "private, max-age=86400",
    },
  });
}
