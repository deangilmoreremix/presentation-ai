"use server";

import { z } from "zod";

import { getCurrentUser } from "@/lib/supabase/server";

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
  const currentUser = await getCurrentUser();
  const userId = currentUser?.id;
  if (!userId) {
    throw new Error("Unauthorized");
  }

  uploadedImagesInputSchema.parse(input ?? {});

  return [];
}
