"use server";

import { env } from "@/env";
import { requireOptionalIntegration } from "@/lib/env/optional-integrations";

type PixabayImage = {
  url: string;
  thumb?: string;
  title?: string;
  author?: string;
  link?: string;
};

interface PixabayImageResponse {
  id: number;
  pageURL: string;
  type: string;
  tags: string;
  previewURL: string;
  webformatURL: string;
  largeImageURL: string;
  imageURL?: string;
  user: string;
  userImageURL?: string;
}

interface PixabayResponse {
  total: number;
  totalHits: number;
  hits: PixabayImageResponse[];
}

export async function searchPixabayImages(
  query: string,
  perPage = 20,
  page = 1,
): Promise<{ success: boolean; images?: PixabayImage[]; error?: string }> {
  const pixabayConfig = requireOptionalIntegration({
    integration: "Pixabay",
    envVar: "PIXABAY_API_KEY",
    value: env.PIXABAY_API_KEY,
    feature: "Pixabay image search",
  });

  if (!pixabayConfig.ok) {
    return {
      success: false,
      error: pixabayConfig.error,
    };
  }

  try {
    const url = new URL("https://pixabay.com/api/");
    url.searchParams.set("key", pixabayConfig.value);
    url.searchParams.set("q", query);
    url.searchParams.set("per_page", String(perPage));
    url.searchParams.set("page", String(page));
    url.searchParams.set("safesearch", "true");

    const response = await fetch(url.toString(), {
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      throw new Error(`Pixabay API error: ${response.status}`);
    }

    const data = (await response.json()) as PixabayResponse;

    return {
      success: true,
      images: data.hits.map((hit) => ({
        url: hit.largeImageURL || hit.webformatURL,
        thumb: hit.previewURL || hit.webformatURL,
        title: hit.tags.split(",").slice(0, 3).join(", ") || undefined,
        author: hit.user || undefined,
        link: hit.pageURL || undefined,
      })),
    };
  } catch (error) {
    console.error("Pixabay search failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to search Pixabay",
    };
  }
}

export async function getTrendingPixabayImages(): Promise<{
  success: boolean;
  images?: PixabayImage[];
  error?: string;
}> {
  const pixabayConfig = requireOptionalIntegration({
    integration: "Pixabay",
    envVar: "PIXABAY_API_KEY",
    value: env.PIXABAY_API_KEY,
    feature: "Pixabay trending images",
  });

  if (!pixabayConfig.ok) {
    return {
      success: false,
      error: pixabayConfig.error,
    };
  }

  try {
    const url = new URL("https://pixabay.com/api/");
    url.searchParams.set("key", pixabayConfig.value);
    url.searchParams.set("per_page", "20");
    url.searchParams.set("page", "1");
    url.searchParams.set("order", "popular");
    url.searchParams.set("safesearch", "true");

    const response = await fetch(url.toString(), {
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      throw new Error(`Pixabay API error: ${response.status}`);
    }

    const data = (await response.json()) as PixabayResponse;

    return {
      success: true,
      images: data.hits.map((hit) => ({
        url: hit.largeImageURL || hit.webformatURL,
        thumb: hit.previewURL || hit.webformatURL,
        title: hit.tags.split(",").slice(0, 3).join(", ") || undefined,
        author: hit.user || undefined,
        link: hit.pageURL || undefined,
      })),
    };
  } catch (error) {
    console.error("Pixabay trending fetch failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load trending Pixabay images",
    };
  }
}

export async function getImageFromPixabay(
  query: string,
  _layoutType?: string,
): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
  const result = await searchPixabayImages(query, 5, 1);
  const firstImage = result.images?.[0];

  if (!result.success || !firstImage?.url) {
    return {
      success: false,
      error: result.error ?? "No Pixabay images found",
    };
  }

  return {
    success: true,
    imageUrl: firstImage.url,
  };
}
