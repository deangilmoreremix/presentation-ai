import { getCurrentUser } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const currentUser = await getCurrentUser();
  const isAuthPage = request.nextUrl.pathname.startsWith("/auth");

  if (request.nextUrl.pathname === "/") {
    return NextResponse.redirect(new URL("/presentation", request.url));
  }

  if (isAuthPage && currentUser) {
    return NextResponse.redirect(new URL("/presentation", request.url));
  }

  if (!currentUser && !isAuthPage && !request.nextUrl.pathname.startsWith("/api")) {
    return NextResponse.redirect(
      new URL(
        `/auth/signin?callbackUrl=${encodeURIComponent(request.url)}`,
        request.url,
      ),
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
