import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

const base64ByteLength = (value) => {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(value, "base64").length;
  }
  try {
    return atob(value).length;
  } catch {
    return -1;
  }
};

const masterKeySchema = z
  .string()
  .optional()
  .superRefine((value, ctx) => {
    if (value === undefined) return;
    const isBase6432Bytes = base64ByteLength(value) === 32;
    const isHex32Bytes = /^[0-9a-fA-F]{64}$/.test(value);
    if (!isBase6432Bytes && !isHex32Bytes) {
      ctx.addIssue({
        code: "custom",
        message:
          "API_KEY_ENCRYPTION_MASTER_KEY must decode to exactly 32 bytes (base64, or 64-character hex). Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\"",
      });
    }
  });

export const env = createEnv({
  server: {
    // Clerk (server-side). Required: `proxy.ts` runs clerkMiddleware on every
    // route and server code calls auth(), so a missing key is a hard failure.
    // Validate at build/start rather than letting Clerk throw at runtime.
    CLERK_SECRET_KEY: z.string().min(1),
    CLERK_WEBHOOK_SECRET: z.string().optional(),

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

    // Sentry (server)
    SENTRY_DSN: z.string().optional(),

    // UploadThing
    UPLOADTHING_TOKEN: z.string().optional(),

    API_KEY_ENCRYPTION_MASTER_KEY: masterKeySchema,
  },

  client: {
    // NEXT_PUBLIC_* vars must live in the client schema for @t3-oss/env-nextjs.
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
    NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
    NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
  },

  runtimeEnv: {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
    CLERK_WEBHOOK_SECRET: process.env.CLERK_WEBHOOK_SECRET,
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
    SENTRY_DSN: process.env.SENTRY_DSN,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    UPLOADTHING_TOKEN: process.env.UPLOADTHING_TOKEN,
    API_KEY_ENCRYPTION_MASTER_KEY: process.env.API_KEY_ENCRYPTION_MASTER_KEY,
  },

  // Only an explicit truthy value skips validation. Using `!!value` here meant
  // `SKIP_ENV_VALIDATION=false` (as shipped in .env.example) silently disabled
  // every check, hiding missing required vars such as the Clerk keys.
  skipValidation: /^(1|true)$/i.test(process.env.SKIP_ENV_VALIDATION ?? ""),
  emptyStringAsUndefined: true,
});
