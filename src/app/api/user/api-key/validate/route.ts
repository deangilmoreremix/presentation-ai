import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import OpenAI from "openai";
import { validateKeyFormat } from "@/lib/crypto/key-encryption";

/**
 * POST /api/user/api-key/validate
 * Body: { key: string }
 * Validates the format of an OpenAI API key and optionally tests it against OpenAI's API.
 * Does NOT store the key.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { key } = body as { key: string };

    if (!key || typeof key !== "string") {
      return NextResponse.json(
        { valid: false, error: "API key is required" },
        { status: 400 }
      );
    }

    // First, format validation
    if (!validateKeyFormat(key)) {
      return NextResponse.json(
        { valid: false, error: "Invalid API key format" },
        { status: 400 }
      );
    }

    // Perform a lightweight API call to verify the key is actually valid
    // Use models.list() — it's fast and doesn't incur charges
    const openai = new OpenAI({
      apiKey: key,
      timeout: 10000, // 10 second timeout
    });

    try {
      await openai.models.list();
      return NextResponse.json({ valid: true });
    } catch (openaiError: any) {
      const message = openaiError?.message || "OpenAI API validation failed";
      return NextResponse.json({ valid: false, error: message }, { status: 400 });
    }
  } catch (error) {
    console.error("Error validating API key:", error);
    return NextResponse.json(
      { valid: false, error: "Failed to validate API key" },
      { status: 500 }
    );
  }
}
