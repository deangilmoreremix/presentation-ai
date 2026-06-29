import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().optional(),
    TAVILY_API_KEY: z.string().optional(),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),

    // OpenAI for text and image generation (required for AI features)
    OPENAI_API_KEY: z.string().optional(),
    UNSPLASH_ACCESS_KEY: z.string().optional(),

    // Supabase auth and admin
    SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

    // Google Custom Search
    GOOGLE_CUSTOM_SEARCH_API_KEY: z.string().optional(),
    SEARCH_ENGINE_CX: z.string().optional(),

    // FAL AI
    FAL_API_KEY: z.string().optional(),
  },

  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    TAVILY_API_KEY: process.env.TAVILY_API_KEY,
    NODE_ENV: process.env.NODE_ENV,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    UNSPLASH_ACCESS_KEY: process.env.UNSPLASH_ACCESS_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    GOOGLE_CUSTOM_SEARCH_API_KEY: process.env.GOOGLE_CUSTOM_SEARCH_API_KEY,
    SEARCH_ENGINE_CX: process.env.SEARCH_ENGINE_CX,
    FAL_API_KEY: process.env.FAL_API_KEY,
  },

  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});