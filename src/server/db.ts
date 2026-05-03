import { PrismaClient } from "@prisma/client";

import { env } from "@/env";

const createPrismaClient = () =>
  new PrismaClient({
    log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== "production") globalForPrisma.prisma = db;

// Handle database connection errors gracefully in development
if (env.NODE_ENV === "development") {
  db.$on("error", (e) => {
    console.warn("Database connection error (non-fatal in dev):", e.message);
  });

  db.$on("warn", (e) => {
    console.warn("Database warning:", e.message);
  });
}
