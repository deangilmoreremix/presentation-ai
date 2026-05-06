import { NextResponse } from "next/server";

/**
 * GET /api/user/api-key
 * For anonymous usage, API keys are only stored client-side.
 * This endpoint returns empty response since we don't store keys server-side for anonymous users.
 */
export async function GET() {
  // Anonymous users don't have server-stored API keys
  return NextResponse.json({ success: true, maskedKey: null, storage: "none" });
}

/**
 * POST /api/user/api-key
 * Body: { key: string; storage: "client" | "server" }
 * For anonymous usage, only client-side storage is allowed.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { storage } = body as { key: string; storage: "client" | "server" };

    if (storage === "server") {
      return NextResponse.json(
        { error: "Server storage not available for anonymous users. Use client storage only." },
        { status: 400 }
      );
    }

    // For client storage, we don't need to do anything server-side
    // The client handles localStorage storage
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error processing API key:", error);
    return NextResponse.json(
      { error: "Failed to process API key" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/user/api-key
 * For anonymous usage, no server-side cleanup needed.
 */
export async function DELETE() {
  // No server-side cleanup needed for anonymous users
  return NextResponse.json({ success: true });
}
