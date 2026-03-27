import { env } from "@/env";
import { NextResponse } from "next/server";

interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  version: string;
  services: {
    database: ServiceStatus;
    ai: AIServiceStatus;
    storage: ServiceStatus;
  };
  features: {
    aiGeneration: boolean;
    imageGeneration: boolean;
    webSearch: boolean;
    localModels: boolean;
    auth: boolean;
  };
  environment: string;
}

interface ServiceStatus {
  status: "up" | "down" | "unknown";
  latency?: number;
  error?: string;
}

interface AIServiceStatus extends ServiceStatus {
  provider: string;
  availableModels: string[];
}

export async function GET(): Promise<NextResponse<HealthStatus>> {
  const startTime = Date.now();
  const services: HealthStatus["services"] = {
    database: { status: "unknown" },
    ai: { status: "unknown", provider: "none", availableModels: [] },
    storage: { status: "unknown" },
  };

  const features: HealthStatus["features"] = {
    aiGeneration: false,
    imageGeneration: false,
    webSearch: false,
    localModels: false,
    auth: false,
  };

  try {
    const { PrismaClient } = await import("@prisma/client");
    const prisma = new PrismaClient({
      datasources: { db: { url: env.DATABASE_URL } },
    });

    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    services.database = {
      status: "up",
      latency: Date.now() - dbStart,
    };

    await prisma.$disconnect();
  } catch (error) {
    services.database = {
      status: "down",
      error: error instanceof Error ? error.message : "Unknown database error",
    };
  }

  const aiProviders: string[] = [];
  if (env.OPENAI_API_KEY) {
    aiProviders.push("openai");
    features.aiGeneration = true;
  }
  if (env.TOGETHER_AI_API_KEY) {
    aiProviders.push("together");
    features.aiGeneration = true;
  }
  if (env.OLLAMA_BASE_URL) {
    aiProviders.push("ollama");
    features.localModels = true;
    features.aiGeneration = true;
  }
  if (env.LM_STUDIO_BASE_URL) {
    aiProviders.push("lmstudio");
    features.localModels = true;
    features.aiGeneration = true;
  }

  if (aiProviders.length === 0) {
    services.ai = {
      status: "down",
      provider: "none",
      availableModels: ["mock"],
      error: "No AI provider configured - using mock responses",
    };
  } else {
    services.ai = {
      status: "up",
      provider: aiProviders.join(", "),
      availableModels: aiProviders,
    };
  }

  if (env.UNSPLASH_ACCESS_KEY) {
    features.imageGeneration = true;
  }

  if (env.TAVILY_API_KEY) {
    features.webSearch = true;
  }

  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
    features.auth = true;
  } else if (env.NODE_ENV === "development") {
    features.auth = true;
  }

  let overallStatus: HealthStatus["status"] = "healthy";

  if (services.database.status === "down") {
    overallStatus = "unhealthy";
  } else if (
    services.ai.status === "down" ||
    (!features.aiGeneration && !features.localModels)
  ) {
    overallStatus = "degraded";
  }

  return NextResponse.json(
    {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || "1.0.0",
      services,
      features,
      environment: env.NODE_ENV || "development",
    },
    {
      status: overallStatus === "unhealthy" ? 503 : 200,
      headers: {
        "Cache-Control": "no-store",
        "X-Response-Time": `${Date.now() - startTime}ms`,
      },
    },
  );
}
