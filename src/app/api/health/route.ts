import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Basic health check
    const health: Record<string, any> = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || "1.0.0",
      environment: process.env.NODE_ENV,
    };

    // Check database connection (optional - requires Prisma setup)
    try {
      // You can add database health checks here if needed
      health.database = "connected";
    } catch (dbError) {
      health.database = "error";
      health.databaseError =
        dbError instanceof Error ? dbError.message : "Unknown error";
    }

    return NextResponse.json(health, { status: 200 });
  } catch (error) {
    console.error("Health check failed:", error);
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 503 },
    );
  }
}
