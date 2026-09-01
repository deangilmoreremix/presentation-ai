import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    // Server-only Supabase secret
    SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

    // Direct Postgres connection for LangGraph checkpoint persistence
    // (replaces the Prisma `DATABASE_URL`).
    DATABASE_URL: z.string().url(),

    TAVILY_API_KEY: z.string().optional(),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),

    OPENAI_API_KEY: z.string().optional(),
    TOGETHER_AI_API_KEY: z.string().optional(),
    PINECONE_API_KEY: z.string().optional(),
    UNSPLASH_ACCESS_KEY: z.string().optional(),
    PIXABAY_API_KEY: z.string().optional(),
    GIPHY_API_KEY: z.string().optional(),
    PEXELS_API_KEY: z.string().optional(),

    // Google Custom Search
    GOOGLE_CUSTOM_SEARCH_API_KEY: z.string().optional(),
    SEARCH_ENGINE_CX: z.string().optional(),
  },

  client: {
    // NEXT_PUBLIC_* vars must live in the client schema for @t3-oss/env-nextjs.
    NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
  },

  runtimeEnv: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    DATABASE_URL: process.env.DATABASE_URL,
    UNSPLASH_ACCESS_KEY: process.env.UNSPLASH_ACCESS_KEY,
    PIXABAY_API_KEY: process.env.PIXABAY_API_KEY,
    GIPHY_API_KEY: process.env.GIPHY_API_KEY,
    PEXELS_API_KEY: process.env.PEXELS_API_KEY,
    TAVILY_API_KEY: process.env.TAVILY_API_KEY,
    NODE_ENV: process.env.NODE_ENV,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    TOGETHER_AI_API_KEY: process.env.TOGETHER_AI_API_KEY,
    PINECONE_API_KEY: process.env.PINECONE_API_KEY,
    GOOGLE_CUSTOM_SEARCH_API_KEY: process.env.GOOGLE_CUSTOM_SEARCH_API_KEY,
    SEARCH_ENGINE_CX: process.env.SEARCH_ENGINE_CX,
  },

  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
