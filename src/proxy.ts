import { rateLimit } from "@/lib/rate-limit";
import { auth } from "@/server/auth";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const session = await auth();
  const isAuthPage = request.nextUrl.pathname.startsWith("/auth");

  // Always redirect from root to /presentation
  if (request.nextUrl.pathname === "/") {
    return NextResponse.redirect(new URL("/presentation", request.url));
  }

  // If user is on auth page but already signed in, redirect to home page
  if (isAuthPage && session) {
    return NextResponse.redirect(new URL("/presentation", request.url));
  }

  // If user is not authenticated and trying to access a protected route, redirect to sign-in
  if (!session && !isAuthPage && !request.nextUrl.pathname.startsWith("/api")) {
    return NextResponse.redirect(
      new URL(
        `/auth/signin?callbackUrl=${encodeURIComponent(request.url)}`,
        request.url,
      ),
    );
  }

  // Rate limiting for API routes
  if (request.nextUrl.pathname.startsWith("/api/")) {
    const isAIGeneration =
      request.nextUrl.pathname.includes("/generate") ||
      request.nextUrl.pathname.includes("/text-to-diagram") ||
      request.nextUrl.pathname.includes("/prompt-to-diagram");

    const result = await rateLimit(request, {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: isAIGeneration ? 5 : 30,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          error: "Too many requests",
          message: `Rate limit exceeded. Try again in ${Math.ceil(result.resetIn / 1000)} seconds.`,
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": String(isAIGeneration ? 5 : 30),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(Date.now() + result.resetIn),
            "Retry-After": String(Math.ceil(result.resetIn / 1000)),
          },
        },
      );
    }
  }

  return NextResponse.next();
}

// Add routes that should be processed by this proxy
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
