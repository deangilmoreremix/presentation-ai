import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { type NextRequest } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

/**
 * Public routes that do not require authentication.
 */
const isPublicRoute = createRouteMatcher([
  "/",
  "/templates",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/auth/signin(.*)",
  "/auth/signout(.*)",
  "/api/health(.*)",
  "/api/webhooks/clerk(.*)",
  "/api/test/image-search-providers(.*)",
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

/**
 * Clerk production instances serve clerk-js from their own Frontend API host
 * (e.g. clerk.example.com), which is encoded in the publishable key as
 * base64("<host>$"). It must be allowed by the CSP or the auth UI never loads.
 */
function getClerkFrontendApiHost(): string | null {
  const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!key) return null;
  try {
    const encoded = key.split("_").slice(2).join("_");
    const host = atob(encoded).replace(/\$$/, "");
    return /^[a-z0-9.-]+$/i.test(host) ? host : null;
  } catch {
    return null;
  }
}

// Development falls back to Clerk keyless mode, so only bypass Clerk when a
// production build is missing its keys.
const isClerkConfigured =
  process.env.NODE_ENV !== "production" ||
  Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
      process.env.CLERK_SECRET_KEY,
  );

function buildContentSecurityPolicy(): string {
  const clerkHost = getClerkFrontendApiHost();
  const clerk = [
    "https://*.clerk.com",
    "https://*.clerk.accounts.dev",
    ...(clerkHost ? [`https://${clerkHost}`] : []),
  ].join(" ");
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${clerk} https://challenges.cloudflare.com blob:`,
    "worker-src 'self' blob:",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://img.clerk.com https://cdn.ppttemplate.ai https://lh3.googleusercontent.com https://*.ufs.sh https://images.unsplash.com https://*.supabase.co https://media.giphy.com https://i.giphy.com https://images.pexels.com https://cdn.pixabay.com",
    "font-src 'self' data:",
    `connect-src 'self' https://api.openai.com https://*.supabase.co wss://*.supabase.co ${clerk} https://clerk-telemetry.com https://*.ufs.sh https://*.uploadthing.com https://*.ingest.sentry.io https://*.ingest.us.sentry.io https://cdn.ppttemplate.ai https://api.unsplash.com https://www.googleapis.com https://fonts.googleapis.com https://fonts.gstatic.com https://cdn.jsdelivr.net https://api.giphy.com https://api.pexels.com https://cdn.pixabay.com`,
    `frame-src 'self' ${clerk} https://challenges.cloudflare.com https://www.youtube.com https://player.vimeo.com https://www.loom.com https://www.figma.com https://www.google.com https://codepen.io`,
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

async function applyRateLimit(request: NextRequest): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/api/")) return null;
  const config = getRateLimitConfig(pathname);
  const result = await rateLimit(request, config);
  if (result.success) return null;
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

const withClerk = clerkMiddleware(async (auth, request: NextRequest) => {
  const { pathname } = request.nextUrl;

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

  const limited = await applyRateLimit(request);
  if (limited) return limited;

  return applySecurityHeaders(NextResponse.next());
});

/**
 * Without Clerk keys clerkMiddleware throws on every request in production,
 * which takes the whole site down. Serve public pages instead and let the
 * app show a configuration notice.
 */
async function withoutClerk(request: NextRequest) {
  const limited = await applyRateLimit(request);
  if (limited) return limited;
  return applySecurityHeaders(NextResponse.next());
}

export default isClerkConfigured ? withClerk : withoutClerk;

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
