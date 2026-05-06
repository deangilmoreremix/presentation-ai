import { NextResponse } from "next/server";
import { db } from "@/server/db";

export async function GET() {
  try {
    const health: Record<string, any> = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || "1.0.0",
      environment: process.env.NODE_ENV,
      database: "disconnected",
    };

    // Check database connectivity
    try {
      await db.$queryRaw`SELECT 1`;
      health.database = "connected";
    } catch (dbError) {
      health.status = "unhealthy";
      health.database = "disconnected";
      health.databaseError =
        dbError instanceof Error ? dbError.message : "Unknown error";
    }

    return NextResponse.json(health, {
      status: health.status === "healthy" ? 200 : 503,
    });
  } catch (error) {
    console.error("Health check failed:", error);
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 503 }
    );
  }
}
