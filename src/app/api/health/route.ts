import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const startedAt = Date.now();

  try {
    // Basic app health
    const health: Record<string, unknown> = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || "0.1.0",
      environment: process.env.NODE_ENV,
      database: "not_configured",
    };

    // Check database connection (Supabase)
    try {
      const supabase = await createClient();

      if (!supabase) {
        health.database = "not_configured";
      } else {
        const { error } = await supabase
          .from("base_documents")
          .select("id", { count: "exact", head: true });

        if (error) {
          health.database = "error";
          health.databaseError = error.message;
          health.status = "degraded";
        } else {
          health.database = "connected";
        }
      }
    } catch (dbError) {
      health.database = "error";
      health.databaseError =
        dbError instanceof Error ? dbError.message : "Unknown error";
      health.status = "degraded";
    }

    health.responseTimeMs = Date.now() - startedAt;

    const statusCode = health.status === "healthy" ? 200 : 503;

    return NextResponse.json(health, { status: statusCode });
  } catch (error) {
    console.error("Health check failed:", error);

    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
        responseTimeMs: Date.now() - startedAt,
      },
      { status: 503 },
    );
  }
}
