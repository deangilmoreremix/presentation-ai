import { NextRequest, NextResponse } from "next/server";

// Performance monitoring middleware
export function performanceMiddleware(request: NextRequest) {
  const startTime = Date.now();

  // Create response wrapper to track response time
  const originalEnd = Response.prototype;
  const trackedResponse = new Proxy(originalEnd, {
    construct(target, args) {
      const response = Reflect.construct(target, args) as Response;
      const duration = Date.now() - startTime;

      // Log slow requests in production
      if (process.env.NODE_ENV === "production" && duration > 1000) {
        console.warn(`Slow request: ${request.method} ${request.url} took ${duration}ms`);
      }

      // Add performance headers
      if (!response.headers.has("X-Response-Time")) {
        response.headers.set("X-Response-Time", `${duration}ms`);
      }

      return response;
    },
  });

  // Temporarily replace Response constructor
  (globalThis as any).Response = trackedResponse;

  const response = NextResponse.next();

  // Restore original Response constructor
  (globalThis as any).Response = originalEnd;

  return response;
}

// Performance monitoring utilities
export class PerformanceMonitor {
  private static metrics = new Map<string, number[]>();

  static recordMetric(name: string, value: number, maxSamples: number = 100) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const samples = this.metrics.get(name)!;
    samples.push(value);

    // Keep only the last maxSamples
    if (samples.length > maxSamples) {
      samples.shift();
    }
  }

  static getAverage(name: string): number {
    const samples = this.metrics.get(name);
    if (!samples || samples.length === 0) return 0;

    return samples.reduce((sum, value) => sum + value, 0) / samples.length;
  }

  static getPercentile(name: string, percentile: number): number {
    const samples = this.metrics.get(name);
    if (!samples || samples.length === 0) return 0;

    const sorted = [...samples].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  static logMetrics() {
    if (process.env.NODE_ENV !== "production") return;

    console.log("Performance Metrics:");
    for (const [name, samples] of this.metrics.entries()) {
      const avg = this.getAverage(name);
      const p95 = this.getPercentile(name, 95);
      const p99 = this.getPercentile(name, 99);
      console.log(`${name}: avg=${avg.toFixed(2)}ms, p95=${p95.toFixed(2)}ms, p99=${p99.toFixed(2)}ms (${samples.length} samples)`);
    }
  }
}

// Database query performance wrapper
export async function withQueryPerformance<T>(
  operation: string,
  query: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();
  try {
    const result = await query();
    const duration = Date.now() - startTime;
    PerformanceMonitor.recordMetric(`db.${operation}`, duration);
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    PerformanceMonitor.recordMetric(`db.${operation}.error`, duration);
    throw error;
  }
}

// API route performance wrapper
export function withApiPerformance<T extends any[]>(
  handler: (...args: T) => Promise<Response> | Response
) {
  return async (...args: T): Promise<Response> => {
    const startTime = Date.now();
    try {
      const response = await handler(...args);
      const duration = Date.now() - startTime;

      // Clone response to add performance header
      const newResponse = new Response(response.body, response);
      newResponse.headers.set("X-Response-Time", `${duration}ms`);

      PerformanceMonitor.recordMetric("api.response_time", duration);
      return newResponse;
    } catch (error) {
      const duration = Date.now() - startTime;
      PerformanceMonitor.recordMetric("api.error_time", duration);
      throw error;
    }
  };
}