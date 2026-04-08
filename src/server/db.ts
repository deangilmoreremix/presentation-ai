import { PrismaClient } from "@prisma/client";

import { env } from "@/env";

const createPrismaClient = () =>
  new PrismaClient({
    log: env.NODE_ENV === "development" ? ["query", "warn", "error"] : ["warn", "error"],
    // Production optimizations
    ...(env.NODE_ENV === "production" && {
      // Connection pooling configuration
      datasources: {
        db: {
          url: env.DATABASE_URL,
        },
      },
    }),
  });

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== "production") globalForPrisma.prisma = db;

// Graceful shutdown
process.on("beforeExit", async () => {
  await db.$disconnect();
});
