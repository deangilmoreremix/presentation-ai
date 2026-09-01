"use server";

import { env } from "@/env";
import { requireOptionalIntegration } from "@/lib/env/optional-integrations";

type GifResult = {
  id: string;
  url: string;
  thumb?: string;
  title?: string;
};

export async function getTrendingGiphyGifs(): Promise<{
  success: boolean;
  gifs?: GifResult[];
  error?: string;
}> {
  const giphyConfig = requireOptionalIntegration({
    integration: "Giphy",
    envVar: "GIPHY_API_KEY",
    value: env.GIPHY_API_KEY,
    feature: "Giphy trending GIF search",
  });

  if (!giphyConfig.ok) {
    return {
      success: false,
      error: giphyConfig.error,
    };
  }

  try {
    const response = await fetch(
      `https://api.giphy.com/v1/gifs/trending?api_key=${encodeURIComponent(giphyConfig.value)}&limit=20&offset=0&rating=g`,
      { next: { revalidate: 60 } },
    );

    if (!response.ok) {
      throw new Error(`Giphy API error: ${response.status}`);
    }

    const data = await response.json();

    return {
      success: true,
      gifs: data.data.map((gif: Record<string, unknown>) => ({
        id: String(gif.id),
        url: String((gif.images as Record<string, Record<string, string>>)?.original?.url ?? ""),
        thumb: String((gif.images as Record<string, Record<string, string>>)?.fixed_height?.url ?? ""),
        title: gif.title ? String(gif.title) : undefined,
      })),
    };
  } catch (error) {
    console.error("Giphy trending fetch failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load trending GIFs",
    };
  }
}

export async function searchGiphyGifs(
  query: string,
): Promise<{ success: boolean; gifs?: GifResult[]; error?: string }> {
  const giphyConfig = requireOptionalIntegration({
    integration: "Giphy",
    envVar: "GIPHY_API_KEY",
    value: env.GIPHY_API_KEY,
    feature: "Giphy GIF search",
  });

  if (!giphyConfig.ok) {
    return {
      success: false,
      error: giphyConfig.error,
    };
  }

  try {
    const response = await fetch(
      `https://api.giphy.com/v1/gifs/search?api_key=${encodeURIComponent(giphyConfig.value)}&q=${encodeURIComponent(query)}&limit=20&offset=0&rating=g`,
      { next: { revalidate: 60 } },
    );

    if (!response.ok) {
      throw new Error(`Giphy API error: ${response.status}`);
    }

    const data = await response.json();

    return {
      success: true,
      gifs: data.data.map((gif: Record<string, unknown>) => ({
        id: String(gif.id),
        url: String((gif.images as Record<string, Record<string, string>>)?.original?.url ?? ""),
        thumb: String((gif.images as Record<string, Record<string, string>>)?.fixed_height?.url ?? ""),
        title: gif.title ? String(gif.title) : undefined,
      })),
    };
  } catch (error) {
    console.error("Giphy search failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to search GIFs",
    };
  }
}
