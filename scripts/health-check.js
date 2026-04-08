#!/usr/bin/env node
// Production health check script
// This script can be run periodically to check application health

import { execSync } from "child_process";
import { readFileSync } from "fs";

const HEALTH_CHECK_URL = process.env.HEALTH_CHECK_URL || "http://localhost:3000/api/health";
const MONITORING_URL = process.env.MONITORING_URL || "http://localhost:3000/api/monitoring";

interface HealthStatus {
  status: "healthy" | "unhealthy";
  checks: {
    database: { healthy: boolean; error?: string };
    system: { healthy: boolean; memory?: any };
  };
  timestamp: string;
}

async function checkHealth(): Promise<HealthStatus | null> {
  try {
    const response = await fetch(HEALTH_CHECK_URL, {
      timeout: 5000, // 5 second timeout
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Health check failed:", error);
    return null;
  }
}

function checkSystemResources() {
  try {
    // Check disk usage
    const diskUsage = execSync("df / | tail -1 | awk '{print $5}'", { encoding: "utf8" }).trim();
    const diskPercent = parseInt(diskUsage.replace("%", ""));

    // Check memory usage
    const memInfo = readFileSync("/proc/meminfo", "utf8");
    const totalMemMatch = memInfo.match(/MemTotal:\s+(\d+)/);
    const availableMemMatch = memInfo.match(/MemAvailable:\s+(\d+)/);

    if (totalMemMatch && availableMemMatch) {
      const totalMem = parseInt(totalMemMatch[1]);
      const availableMem = parseInt(availableMemMatch[1]);
      const usedPercent = ((totalMem - availableMem) / totalMem) * 100;

      return {
        diskUsage: diskPercent,
        memoryUsage: Math.round(usedPercent),
        healthy: diskPercent < 90 && usedPercent < 90,
      };
    }
  } catch (error) {
    console.error("System resource check failed:", error);
  }

  return { healthy: false };
}

function sendAlert(message: string) {
  console.error(`🚨 ALERT: ${message}`);

  // In production, integrate with alerting service:
  // - Slack webhook
  // - PagerDuty
  // - Email
  // - SMS

  if (process.env.SLACK_WEBHOOK_URL) {
    fetch(process.env.SLACK_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `🚨 Production Alert: ${message}`,
        username: "Health Monitor",
        icon_emoji: ":warning:",
      }),
    }).catch(err => console.error("Failed to send Slack alert:", err));
  }
}

async function main() {
  console.log("🔍 Running production health checks...");

  // Check application health
  const health = await checkHealth();

  if (!health) {
    sendAlert("Application is not responding to health checks");
    process.exit(1);
  }

  // Check system resources
  const systemResources = checkSystemResources();

  // Report status
  console.log(`📊 Status: ${health.status.toUpperCase()}`);
  console.log(`🗄️  Database: ${health.checks.database.healthy ? "✅ Healthy" : "❌ Unhealthy"}`);
  console.log(`💻 System: ${health.checks.system.healthy ? "✅ Healthy" : "❌ Unhealthy"}`);

  if (systemResources) {
    console.log(`💾 Disk Usage: ${systemResources.diskUsage}%`);
    console.log(`🧠 Memory Usage: ${systemResources.memoryUsage}%`);
  }

  // Check for issues
  const issues = [];

  if (!health.checks.database.healthy) {
    issues.push("Database connection issues");
  }

  if (!health.checks.system.healthy) {
    issues.push("High system resource usage");
  }

  if (systemResources && !systemResources.healthy) {
    issues.push("Critical system resource levels");
  }

  if (issues.length > 0) {
    sendAlert(`Health check issues detected: ${issues.join(", ")}`);
    process.exit(1);
  }

  console.log("✅ All health checks passed");
  process.exit(0);
}

main().catch(error => {
  console.error("Health check script failed:", error);
  sendAlert("Health check script failed to execute");
  process.exit(1);
});