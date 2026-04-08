import { NextResponse } from "next/server";
import { logger } from "@/lib/logging";
import { PerformanceMonitor } from "@/lib/performance/monitor";
import { prisma } from "@/prisma/client";

export async function GET(request: Request) {
  try {
    // Basic health checks
    const dbHealth = await checkDatabaseHealth();
    const systemHealth = checkSystemHealth();

    // Performance metrics
    const metrics = {
      "api.response_time.avg": PerformanceMonitor.getAverage("api.response_time"),
      "api.response_time.p95": PerformanceMonitor.getPercentile("api.response_time", 95),
      "api.response_time.p99": PerformanceMonitor.getPercentile("api.response_time", 99),
      "db.query_time.avg": PerformanceMonitor.getAverage("db.query_time"),
    };

    // Recent logs (last 50 entries)
    const recentLogs = logger.getRecentLogs(50);

    // System info
    const systemInfo = {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      nodeVersion: process.version,
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
    };

    const healthData = {
      status: dbHealth.healthy && systemHealth.healthy ? "healthy" : "unhealthy",
      checks: {
        database: dbHealth,
        system: systemHealth,
      },
      metrics,
      logs: recentLogs,
      system: systemInfo,
    };

    const statusCode = healthData.status === "healthy" ? 200 : 503;

    return NextResponse.json(healthData, { status: statusCode });
  } catch (error) {
    logger.error("Health check failed", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      {
        status: "error",
        message: "Health check failed",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

async function checkDatabaseHealth() {
  try {
    // Simple query to check database connectivity
    await prisma.$queryRaw`SELECT 1 as health_check`;
    return { healthy: true };
  } catch (error) {
    logger.error("Database health check failed", { error: error instanceof Error ? error.message : String(error) });
    return {
      healthy: false,
      error: error instanceof Error ? error.message : "Database connection failed"
    };
  }
}

function checkSystemHealth() {
  const memUsage = process.memoryUsage();
  const memUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

  // Consider unhealthy if memory usage is above 90%
  const memoryHealthy = memUsagePercent < 90;

  return {
    healthy: memoryHealthy,
    memory: {
      used: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
      total: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
      usagePercent: Math.round(memUsagePercent),
    },
  };
}