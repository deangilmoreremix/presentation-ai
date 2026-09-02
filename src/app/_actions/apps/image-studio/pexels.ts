"use server";

import { env } from "@/env";
import { requireOptionalIntegration } from "@/lib/env/optional-integrations";

type PexelsImage = {
  id: number;
  url: string;
  thumb?: string;
  title?: string;
  author?: string;
  link?: string;
};

interface PexelsPhoto {
  id: number;
  src: {
    original?: string;
    large?: string;
    medium?: string;
    small?: string;
    portrait?: string;
    landscape?: string;
    tiny?: string;
  };
  photographer: string;
  photographer_url?: string;
  url: string;
  alt?: string;
}

interface PexelsSearchResponse {
  total_results: number;
  page: number;
  per_page: number;
  photos: PexelsPhoto[];
}

interface PexelsCuratedResponse {
  page: number;
  per_page: number;
  photos: PexelsPhoto[];
}

export async function searchPexelsImages(
  query: string,
  perPage = 20,
  page = 1,
): Promise<{ success: boolean; images?: PexelsImage[]; error?: string }> {
  const pexelsConfig = requireOptionalIntegration({
    integration: "Pexels",
    envVar: "PEXELS_API_KEY",
    value: env.PEXELS_API_KEY,
    feature: "Pexels image search",
  });

  if (!pexelsConfig.ok) {
    return {
      success: false,
      error: pexelsConfig.error,
    };
  }

  try {
    const url = new URL("https://api.pexels.com/v1/search");
    url.searchParams.set("query", query);
    url.searchParams.set("per_page", String(perPage));
    url.searchParams.set("page", String(page));

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: pexelsConfig.value,
      },
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      throw new Error(`Pexels API error: ${response.status}`);
    }

    const data = (await response.json()) as PexelsSearchResponse;

    return {
      success: true,
      images: data.photos.map((photo) => ({
        id: photo.id,
        url: photo.src.large || photo.src.original || photo.src.medium || "",
        thumb: photo.src.small || photo.src.medium || photo.src.tiny || "",
        title: photo.alt || undefined,
        author: photo.photographer || undefined,
        link: photo.photographer_url || photo.url || undefined,
      })),
    };
  } catch (error) {
    console.error("Pexels search failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to search Pexels",
    };
  }
}

export async function getTrendingPexelsImages(): Promise<{
  success: boolean;
  images?: PexelsImage[];
  error?: string;
}> {
  const pexelsConfig = requireOptionalIntegration({
    integration: "Pexels",
    envVar: "PEXELS_API_KEY",
    value: env.PEXELS_API_KEY,
    feature: "Pexels curated images",
  });

  if (!pexelsConfig.ok) {
    return {
      success: false,
      error: pexelsConfig.error,
    };
  }

  try {
    const url = new URL("https://api.pexels.com/v1/curated");
    url.searchParams.set("per_page", "20");
    url.searchParams.set("page", "1");

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: pexelsConfig.value,
      },
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      throw new Error(`Pexels API error: ${response.status}`);
    }

    const data = (await response.json()) as PexelsCuratedResponse;

    return {
      success: true,
      images: data.photos.map((photo) => ({
        id: photo.id,
        url: photo.src.large || photo.src.original || photo.src.medium || "",
        thumb: photo.src.small || photo.src.medium || photo.src.tiny || "",
        title: photo.alt || undefined,
        author: photo.photographer || undefined,
        link: photo.photographer_url || photo.url || undefined,
      })),
    };
  } catch (error) {
    console.error("Pexels curated fetch failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load curated Pexels images",
    };
  }
}

export async function getImageFromPexels(
  query: string,
  _layoutType?: string,
): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
  const result = await searchPexelsImages(query, 5, 1);
  const firstImage = result.images?.[0];

  if (!result.success || !firstImage?.url) {
    return {
      success: false,
      error: result.error ?? "No Pexels images found",
    };
  }

  return {
    success: true,
    imageUrl: firstImage.url,
  };
}
