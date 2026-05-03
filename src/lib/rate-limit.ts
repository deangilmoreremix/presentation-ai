import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimits = new Map<string, RateLimitEntry>();
const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: 60 * 1000,
  maxRequests: 30,
};

export async function rateLimit(
  request: NextRequest,
  config: RateLimitConfig = DEFAULT_CONFIG,
): Promise<{ success: boolean; remaining: number; resetIn: number }> {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  const key = `${ip}:${request.nextUrl.pathname}`;
  const now = Date.now();

  const entry = rateLimits.get(key);

  if (!entry || now > entry.resetTime) {
    rateLimits.set(key, {
      count: 1,
      resetTime: now + config.windowMs,
    });
    return {
      success: true,
      remaining: config.maxRequests - 1,
      resetIn: config.windowMs,
    };
  }

  if (entry.count >= config.maxRequests) {
    return {
      success: false,
      remaining: 0,
      resetIn: entry.resetTime - now,
    };
  }

  entry.count++;
  return {
    success: true,
    remaining: config.maxRequests - entry.count,
    resetIn: entry.resetTime - now,
  };
}

export async function rateLimitMiddleware(
  request: NextRequest,
  config?: RateLimitConfig,
): Promise<NextResponse | null> {
  const result = await rateLimit(request, config);

  if (!result.success) {
    return NextResponse.json(
      {
        error: "Too many requests",
        message: `Rate limit exceeded. Try again in ${Math.ceil(result.resetIn / 1000)} seconds.`,
      },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": String(
            config?.maxRequests || DEFAULT_CONFIG.maxRequests,
          ),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Date.now() + result.resetIn),
          "Retry-After": String(Math.ceil(result.resetIn / 1000)),
        },
      },
    );
  }

  return null;
}

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimits.entries()) {
    if (now > entry.resetTime) {
      rateLimits.delete(key);
    }
  }
}, 60 * 1000);

export async function authenticatedRateLimit(
  request: NextRequest,
  config: RateLimitConfig = DEFAULT_CONFIG,
): Promise<{ success: boolean; identifier: string }> {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const identifier =
    token?.email ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "anonymous";

  const key = `auth:${identifier}:${request.nextUrl.pathname}`;
  const now = Date.now();

  const entry = rateLimits.get(key);

  if (!entry || now > entry.resetTime) {
    rateLimits.set(key, {
      count: 1,
      resetTime: now + config.windowMs,
    });
    return { success: true, identifier };
  }

  if (entry.count >= config.maxRequests) {
    return { success: false, identifier };
  }

  entry.count++;
  return { success: true, identifier };
}
