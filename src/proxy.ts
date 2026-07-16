import { getCurrentUser } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const currentUser = await getCurrentUser();
  const isAuthPage = request.nextUrl.pathname.startsWith("/auth");

  if (isAuthPage && currentUser) {
    return NextResponse.redirect(new URL("/presentation", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
