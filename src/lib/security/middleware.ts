import { NextRequest, NextResponse } from "next/server";
import { corsMiddleware } from "@/lib/security/cors";
import { apiRateLimiter, authRateLimiter } from "@/lib/security/rate-limit";

export function securityMiddleware(request: NextRequest) {
  // Apply CORS middleware
  const corsResponse = corsMiddleware(request);
  if (corsResponse.status !== 200) {
    return corsResponse;
  }

  // Get client identifier (IP address)
  const clientIP = request.headers.get("x-forwarded-for") ||
                   request.headers.get("x-real-ip") ||
                   "unknown";

  // Apply rate limiting based on endpoint
  if (request.nextUrl.pathname.startsWith("/api/auth")) {
    if (authRateLimiter.isRateLimited(clientIP)) {
      return NextResponse.json(
        {
          error: "Too many authentication attempts. Please try again later.",
          retryAfter: Math.ceil((authRateLimiter.getResetTime(clientIP) - Date.now()) / 1000)
        },
        {
          status: 429,
          headers: {
            "Retry-After": Math.ceil((authRateLimiter.getResetTime(clientIP) - Date.now()) / 1000).toString(),
            "X-RateLimit-Remaining": authRateLimiter.getRemainingRequests(clientIP).toString(),
          },
        }
      );
    }
  } else if (request.nextUrl.pathname.startsWith("/api")) {
    if (apiRateLimiter.isRateLimited(clientIP)) {
      return NextResponse.json(
        {
          error: "API rate limit exceeded. Please try again later.",
          retryAfter: Math.ceil((apiRateLimiter.getResetTime(clientIP) - Date.now()) / 1000)
        },
        {
          status: 429,
          headers: {
            "Retry-After": Math.ceil((apiRateLimiter.getResetTime(clientIP) - Date.now()) / 1000).toString(),
            "X-RateLimit-Remaining": apiRateLimiter.getRemainingRequests(clientIP).toString(),
          },
        }
      );
    }
  }

  // Add security headers
  const response = NextResponse.next();

  // Security headers
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  // Content Security Policy for production
  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:;"
    );
  }

  return response;
}