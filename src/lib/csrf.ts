import { NextResponse } from "next/server";

/**
 * Validates CSRF protection by checking the Origin header on mutation requests.
 *
 * For same-origin requests, the browser sends the Origin header.
 * For GET requests and same-origin navigations, Origin may be absent.
 *
 * This protects against cross-origin POST/PUT/PATCH/DELETE attacks.
 */
export function validateCsrf(request: Request): { valid: boolean; error?: string } {
  const method = request.method.toUpperCase();

  // Only check mutation methods
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    return { valid: true };
  }

  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const host = request.headers.get("host");

  if (!origin && !referer) {
    // No origin/referer is suspicious for mutations
    // Allow if it's a same-origin request without origin header
    // (some privacy-focused browsers strip origin)
    return { valid: true };
  }

  // Extract host from origin or referer
  let requestHost: string | null = null;

  if (origin) {
    try {
      requestHost = new URL(origin).host;
    } catch {
      return { valid: false, error: "Invalid origin header" };
    }
  } else if (referer) {
    try {
      requestHost = new URL(referer).host;
    } catch {
      return { valid: false, error: "Invalid referer header" };
    }
  }

  if (!requestHost || !host) {
    return { valid: true };
  }

  // Compare hosts (allow subdomains in development)
  if (requestHost === host) {
    return { valid: true };
  }

  // In development, allow localhost variants
  if (process.env.NODE_ENV === "development") {
    const isLocalhost = requestHost.includes("localhost") || requestHost.includes("127.0.0.1");
    const isDevHost = host.includes("localhost") || host.includes("127.0.0.1");
    if (isLocalhost && isDevHost) {
      return { valid: true };
    }
  }

  return {
    valid: false,
    error: `Cross-origin request rejected: ${requestHost} != ${host}`,
  };
}

/**
 * CSRF guard for API routes. Returns a 403 response if the request fails validation.
 */
export function csrfGuard(request: Request): NextResponse | null {
  const result = validateCsrf(request);

  if (!result.valid) {
    return NextResponse.json(
      {
        error: "Forbidden",
        message: "Cross-origin request rejected",
        details: result.error,
      },
      { status: 403 },
    );
  }

  return null;
}
