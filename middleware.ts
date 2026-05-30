// No middleware - not using authentication
// If needed in future, use Node.js runtime to access Prisma

import { type NextRequest, NextResponse } from "next/server";

export async function middleware(_request: NextRequest) {
  // Pass through all requests
  return NextResponse.next();
}