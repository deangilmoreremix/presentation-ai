"use server";

import { z } from "zod";

import { createClient, getClerkUserId } from "@/lib/supabase/server";

const uploadedImagesInputSchema = z.object({
  limit: z.number().int().min(1).max(60).default(30),
  page: z.number().int().min(1).default(1),
});

export type UploadedPresentationImage = {
  createdAt: string;
  id: string;
  mimeType: string;
  name: string;
  url: string;
};

export async function getUploadedImages(input?: {
  limit?: number;
  page?: number;
}): Promise<UploadedPresentationImage[]> {
  const userId = await getClerkUserId();

  uploadedImagesInputSchema.parse(input ?? {});

  const supabase = await createClient();
  if (!supabase) {
    return [];
  }

  const limit = input?.limit ?? 30;
  const page = input?.page ?? 1;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, error } = await supabase
    .from("generated_images")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("Failed to fetch uploaded images:", error);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    url: row.url,
    name: row.prompt ?? "Generated image",
    mimeType: "image/png",
    createdAt: row.created_at,
  }));
}
