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
    OPENAI_API_KEY: z.string(),
    UNSPLASH_ACCESS_KEY: z.string().optional(),

    // Supabase auth and admin
    SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  },

  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    TAVILY_API_KEY: process.env.TAVILY_API_KEY,
    NODE_ENV: process.env.NODE_ENV,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    UNSPLASH_ACCESS_KEY: process.env.UNSPLASH_ACCESS_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },

  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});