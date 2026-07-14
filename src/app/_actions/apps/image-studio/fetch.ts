"use server";

import { createClient, getCurrentUser } from "@/lib/supabase/server";

export type Image = Awaited<ReturnType<typeof getUserImages>>[number];

type GeneratedImageRow = {
  id: string;
  url: string;
  prompt: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  model: string | null;
  size: string | null;
  quality: string | null;
  format: string | null;
  compression: number | null;
  background: string | null;
  action: string | null;
  previous_response_id: string | null;
};

export async function getUserImages({
  page = 1,
  limit = 20,
}: {
  page?: number;
  limit?: number;
} = {}) {
  const currentUser = await getCurrentUser();
  if (!currentUser?.id) {
    return [];
  }

  const supabase = await createClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("generated_images")
    .select("*")
    .eq("user_id", currentUser.id)
    .order("created_at", { ascending: false })
    .range(Math.max(page - 1, 0) * limit, Math.max(page - 1, 0) * limit + limit - 1);

  if (error) {
    console.error(error);
    return [];
  }

  return (data ?? []) as GeneratedImageRow[];
}

export async function fetchGeneratedImages() {
  return getUserImages({ page: 1, limit: 50 });
}
