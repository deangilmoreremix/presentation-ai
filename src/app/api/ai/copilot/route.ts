import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    return NextResponse.json(
      {
        message: "Copilot endpoint is available",
        received: body,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Copilot route error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
