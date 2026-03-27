import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z
      .string()
      .default("postgresql://postgres:postgres@localhost:5432/presentation_ai"),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),

    // AI Providers - All optional with fallbacks
    OPENAI_API_KEY: z.string().optional(),
    TOGETHER_AI_API_KEY: z.string().optional(),
    TAVILY_API_KEY: z.string().optional(),
    FAL_API_KEY: z.string().optional(),
    PINECONE_API_KEY: z.string().optional(),
    UNSPLASH_ACCESS_KEY: z.string().optional(),

    // Local AI Models
    OLLAMA_BASE_URL: z
      .string()
      .default("http://localhost:11434")
      .optional(),
    LM_STUDIO_BASE_URL: z
      .string()
      .default("http://localhost:1234/v1")
      .optional(),

    // Authentication
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    NEXTAUTH_URL: z.preprocess(
      (str) => process.env.VERCEL_URL ?? str,
      process.env.VERCEL ? z.string() : z.string().url().optional(),
    ),
    NEXTAUTH_SECRET: z.string().optional(),

    // Skip validation for development without full config
    SKIP_ENV_VALIDATION: z.string().optional(),
  },

  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    TOGETHER_AI_API_KEY: process.env.TOGETHER_AI_API_KEY,
    TAVILY_API_KEY: process.env.TAVILY_API_KEY,
    FAL_API_KEY: process.env.FAL_API_KEY,
    PINECONE_API_KEY: process.env.PINECONE_API_KEY,
    UNSPLASH_ACCESS_KEY: process.env.UNSPLASH_ACCESS_KEY,
    OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL,
    LM_STUDIO_BASE_URL: process.env.LM_STUDIO_BASE_URL,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    SKIP_ENV_VALIDATION: process.env.SKIP_ENV_VALIDATION,
  },

  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: false,
});
