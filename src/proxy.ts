import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { type NextRequest } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

/**
 * Public routes that do not require authentication.
 */
const isPublicRoute = createRouteMatcher([
  "/",
  "/auth/signin(.*)",
  "/auth/signout(.*)",
  "/api/health(.*)",
  "/api/webhooks/clerk(.*)",
  "/api/webhooks/stripe(.*)",
]);

/**
 * Rate limit configurations by route pattern.
 */
const RATE_LIMITS: Record<string, { windowMs: number; maxRequests: number }> = {
  "/api/presentation/generate": { windowMs: 60 * 1000, maxRequests: 5 },
  "/api/presentation/generate-slide": { windowMs: 60 * 1000, maxRequests: 5 },
  "/api/presentation/generate-image-slides": { windowMs: 60 * 1000, maxRequests: 5 },
  "/api/presentation/outline": { windowMs: 60 * 1000, maxRequests: 10 },
  "/api/presentation/prompt-to-diagram": { windowMs: 60 * 1000, maxRequests: 10 },
  "/api/presentation/text-to-diagram": { windowMs: 60 * 1000, maxRequests: 10 },
  "/api/presentation/edit-diagram": { windowMs: 60 * 1000, maxRequests: 10 },
  "/api/image/generate": { windowMs: 60 * 1000, maxRequests: 10 },
  "/api/image/edit": { windowMs: 60 * 1000, maxRequests: 10 },
  "/api/image/variations": { windowMs: 60 * 1000, maxRequests: 10 },
  "/api/ai/copilot": { windowMs: 60 * 1000, maxRequests: 5 },
  "/api/ai/command": { windowMs: 60 * 1000, maxRequests: 5 },
  "/api/agent/presentation": { windowMs: 60 * 1000, maxRequests: 10 },
  "/api/agent/presentation/search": { windowMs: 60 * 1000, maxRequests: 10 },
  "/api/user/api-key": { windowMs: 60 * 1000, maxRequests: 15 },
  "/api/uploadthing(.*)": { windowMs: 60 * 1000, maxRequests: 10 },
  "/api/webhooks/clerk": { windowMs: 60 * 1000, maxRequests: 20 },
  "/api/webhooks/stripe": { windowMs: 60 * 1000, maxRequests: 60 },
  "/api/billing/checkout": { windowMs: 60 * 1000, maxRequests: 10 },
};

const DEFAULT_RATE_LIMIT = { windowMs: 60 * 1000, maxRequests: 30 };

function getRateLimitConfig(pathname: string): { windowMs: number; maxRequests: number } {
  for (const [pattern, config] of Object.entries(RATE_LIMITS)) {
    if (pathname.startsWith(pattern)) {
      return config;
    }
  }
  return DEFAULT_RATE_LIMIT;
}

function buildContentSecurityPolicy(): string {
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://lh3.googleusercontent.com https://*.ufs.sh https://images.unsplash.com https://*.supabase.co https://media.giphy.com https://i.giphy.com https://images.pexels.com https://cdn.pixabay.com",
    "font-src 'self' data:",
    "connect-src 'self' https://api.openai.com https://*.supabase.co https://*.clerk.com https://*.clerk.accounts.dev https://api.unsplash.com https://www.googleapis.com https://fonts.googleapis.com https://fonts.gstatic.com https://cdn.jsdelivr.net https://api.giphy.com https://api.pexels.com https://cdn.pixabay.com",
    "frame-src 'self' https://www.youtube.com https://player.vimeo.com https://www.loom.com https://www.figma.com https://www.google.com https://codepen.io",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ];
  return csp.join("; ");
}

/**
 * Apply security headers to all responses.
 */
function applySecurityHeaders(response: NextResponse): NextResponse {
  const headers = response.headers;

  headers.set("Content-Security-Policy", buildContentSecurityPolicy());
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("X-XSS-Protection", "1; mode=block");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  if (process.env.NODE_ENV === "production") {
    headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }

  return response;
}

export default clerkMiddleware(async (auth, request: NextRequest) => {
  const { pathname } = request.nextUrl;

  // Enforce authentication for protected routes
  if (!isPublicRoute(request)) {
    const session = await auth();
    if (!session.userId) {
      const signInUrl = new URL("/auth/signin", request.url);
      signInUrl.searchParams.set("redirect", pathname);
      return applySecurityHeaders(
        NextResponse.redirect(signInUrl),
      );
    }
  }

  // Apply rate limiting to API routes
  if (pathname.startsWith("/api/")) {
    const config = getRateLimitConfig(pathname);
    const result = await rateLimit(request, config);

    if (!result.success) {
      return applySecurityHeaders(
        NextResponse.json(
          {
            error: "Too many requests",
            message: `Rate limit exceeded. Try again in ${Math.ceil(result.resetIn / 1000)} seconds.`,
          },
          {
            status: 429,
            headers: {
              "X-RateLimit-Limit": String(config.maxRequests),
              "X-RateLimit-Remaining": "0",
              "X-RateLimit-Reset": String(Date.now() + result.resetIn),
              "Retry-After": String(Math.ceil(result.resetIn / 1000)),
            },
          },
        ),
      );
    }
  }

  return applySecurityHeaders(NextResponse.next());
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
