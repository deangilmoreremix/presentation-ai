import { env } from "@/env";

export default {
  schema: "./prisma/schema.prisma",
  output: "./prisma/migrations",
  generator: {
    client: {
      provider: "prisma-client-js",
      outputMode: "importTypes",
    },
  },
  datasource: {
    db: {
      provider: "postgresql",
      url: env.DATABASE_URL,
    },
  },
};