// No-op database client - actual DB operations use Supabase
// This file exists to prevent import errors in codebase

export const db = {
  generatedImage: {
    create: async () => ({}),
  },
  user: {
    findUnique: async () => null,
    upsert: async () => null,
  },
};

// Silently fail in dev mode
if (process.env.NODE_ENV === "development") {
  console.warn("Prisma DB client is disabled - using Supabase for data persistence");
}