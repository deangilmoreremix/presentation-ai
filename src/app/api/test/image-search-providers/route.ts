import { NextResponse, type NextRequest } from "next/server";
import { getTrendingGiphyGifs, searchGiphyGifs } from "@/app/_actions/apps/image-studio/giphy";
import { searchPixabayImages } from "@/app/_actions/apps/image-studio/pixabay";
import { searchPexelsImages } from "@/app/_actions/apps/image-studio/pexels";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || "test";
  const provider = searchParams.get("provider");

  try {
    if (provider === "pixabay") {
      const result = await searchPixabayImages(query, 5, 1);
      return NextResponse.json(result);
    }

    if (provider === "pexels") {
      const result = await searchPexelsImages(query, 5, 1);
      return NextResponse.json(result);
    }

    if (provider === "giphy") {
      const result = await searchGiphyGifs(query);
      return NextResponse.json(result);
    }

    // Default: run all three and return summary
    const [pixabay, pexels, giphy] = await Promise.all([
      searchPixabayImages(query, 5, 1),
      searchPexelsImages(query, 5, 1),
      searchGiphyGifs(query),
    ]);

    return NextResponse.json({
      pixabay: pixabay.success ? { count: pixabay.images?.length ?? 0 } : { error: pixabay.error },
      pexels: pexels.success ? { count: pexels.images?.length ?? 0 } : { error: pexels.error },
      giphy: giphy.success ? { count: giphy.gifs?.length ?? 0 } : { error: giphy.error },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
