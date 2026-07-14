"use server";

import { env } from "@/env";
import { requireOptionalIntegration } from "@/lib/env/optional-integrations";
import { createClient, getCurrentUser } from "@/lib/supabase/server";

export type ImageModelList =
  | "black-forest-labs/FLUX1.1-pro"
  | "black-forest-labs/FLUX.1-schnell"
  | "black-forest-labs/FLUX.1-schnell-Free"
  | "black-forest-labs/FLUX.1-pro"
  | "black-forest-labs/FLUX.1-dev";

export async function generateImageAction(
  prompt: string,
  model: ImageModelList = "black-forest-labs/FLUX.1-schnell-Free",
) {
  const currentUser = await getCurrentUser();
  if (!currentUser?.user?.id) {
    throw new Error("You must be logged in to generate images");
  }

  const togetherConfig = requireOptionalIntegration({
    integration: "Together AI",
    envVar: "TOGETHER_AI_API_KEY",
    value: env.TOGETHER_AI_API_KEY,
    feature: "AI image generation",
  });

  if (!togetherConfig.ok) {
    return { success: false, error: togetherConfig.error };
  }

  // The `together-ai` SDK is not wired into this build. The active
  // image-generation path used by the UI lives in
  // `apps/image-studio/generate.ts`. This action is retained for API
  // compatibility and reports a clear, non-crashing error.
  return {
    success: false,
    error:
      "Together AI image generation is not available in this build. Use the image studio to generate images.",
  };
}
