import { env } from "@/env";

const globalForPrisma = globalThis as unknown as {
  prisma: import("@prisma/client").PrismaClient | undefined;
};

function createPrismaClient() {
  if (env.NODE_ENV === "development" || !process.env.DATABASE_URL) {
    return new (require("@prisma/client").PrismaClient)({
      log: ["warn", "error"],
    });
  }

  const { PrismaPg } = require("@prisma/adapter-pg");
  const { PrismaClient } = require("@prisma/client");
  const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== "production") globalForPrisma.prisma = db;
