"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Activity, Database, Server, AlertTriangle } from "lucide-react";

interface HealthStatus {
  status: "healthy" | "unhealthy";
  checks: {
    database: { healthy: boolean; error?: string };
    system: { healthy: boolean; memory?: any };
  };
  metrics: Record<string, number>;
  logs: Array<{
    timestamp: string;
    level: string;
    message: string;
  }>;
  system: {
    uptime: number;
    memory: { used: number; total: number; usagePercent: number };
    nodeVersion: string;
    environment: string;
  };
}

export default function MonitoringDashboard() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/monitoring");
      if (!response.ok) throw new Error("Failed to fetch health data");
      const data = await response.json();
      setHealth(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  if (loading && !health) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Monitoring Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600">{error}</p>
          <Button onClick={fetchHealth} className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!health) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy": return "bg-green-100 text-green-800";
      case "unhealthy": return "bg-red-100 text-red-800";
      default: return "bg-yellow-100 text-yellow-800";
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">System Monitoring</h1>
        <Button onClick={fetchHealth} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Overall Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            System Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Badge className={getStatusColor(health.status)}>
              {health.status.toUpperCase()}
            </Badge>
            <span className="text-sm text-gray-600">
              Last updated: {new Date(health.system.timestamp).toLocaleString()}
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Database Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Database
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className={getStatusColor(health.checks.database.healthy ? "healthy" : "unhealthy")}>
              {health.checks.database.healthy ? "HEALTHY" : "UNHEALTHY"}
            </Badge>
            {health.checks.database.error && (
              <p className="text-sm text-red-600 mt-2">{health.checks.database.error}</p>
            )}
          </CardContent>
        </Card>

        {/* System Resources */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              System Resources
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Memory Usage:</span>
                <span>{health.checks.system.memory?.usagePercent || 0}%</span>
              </div>
              <div className="flex justify-between">
                <span>Uptime:</span>
                <span>{formatUptime(health.system.uptime)}</span>
              </div>
              <div className="flex justify-between">
                <span>Node Version:</span>
                <span>{health.system.nodeVersion}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Performance Metrics */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(health.metrics).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="text-sm">{key.replace("api.", "").replace("_", " ")}:</span>
                  <span className="text-sm font-mono">{value.toFixed(2)}ms</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {health.logs.slice(0, 20).map((log, index) => (
              <div key={index} className="flex gap-4 text-sm border-b border-gray-100 pb-2">
                <span className="text-gray-500 min-w-[200px]">
                  {new Date(log.timestamp).toLocaleString()}
                </span>
                <Badge variant="outline" className="min-w-[60px]">
                  {log.level}
                </Badge>
                <span className="flex-1">{log.message}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}