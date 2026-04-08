import { NextRequest, NextResponse } from "next/server";

export function corsMiddleware(request: NextRequest) {
  // Handle preflight requests
  if (request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": process.env.NODE_ENV === "production"
          ? process.env.NEXTAUTH_URL || "https://your-domain.com"
          : "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Max-Age": "86400", // 24 hours
      },
    });
  }

  const response = NextResponse.next();

  // Add CORS headers to all responses
  response.headers.set(
    "Access-Control-Allow-Origin",
    process.env.NODE_ENV === "production"
      ? process.env.NEXTAUTH_URL || "https://your-domain.com"
      : "*"
  );
  response.headers.set("Access-Control-Allow-Credentials", "true");
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");

  return response;
}