import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { appLogger } from "@/lib/observability/logger";
import {
  recordKeyValidatedAt,
  validateProviderKeyFormat,
} from "@/lib/crypto/key-encryption";

/**
 * POST /api/user/api-key/validate
 * Body: { provider: "openai" | "muapi"; key: string }
 *
 * Performs a real, provider-side validation of a candidate credential without
 * storing it. On success it records only the non-sensitive "last validated"
 * timestamp. The credential itself is never logged or persisted here.
 */
export async function POST(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { valid: false, error: "Authentication required" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const provider = body?.provider === "muapi" ? "muapi" : "openai";
    const key = typeof body?.key === "string" ? body.key.trim() : "";

    if (!key) {
      return NextResponse.json(
        { valid: false, error: "API key is required" },
        { status: 400 },
      );
    }

    if (!validateProviderKeyFormat(provider, key)) {
      return NextResponse.json(
        {
          valid: false,
          error:
            provider === "openai"
              ? "Invalid OpenAI key format. Keys start with sk- and are at least 32 characters."
              : "Invalid MuAPI key format.",
        },
        { status: 400 },
      );
    }

    if (provider === "openai") {
      const { default: OpenAI } = await import("openai");
      const openai = new OpenAI({ apiKey: key, timeout: 10000 });

      try {
        // models.list() is read-only and does not bill the user.
        await openai.models.list();
        await recordKeyValidatedAt("openai", userId);
        return NextResponse.json({ valid: true, provider });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "OpenAI API validation failed";
        appLogger.info("OpenAI key validation failed", {
          userId,
          provider,
          // Uses provider error text only; never logs the credential.
          reason: message,
        });
        return NextResponse.json(
          { valid: false, provider, error: message },
          { status: 400 },
        );
      }
    }

    // MuAPI. There is no MuAPI SDK in this project, so validation is a real
    // authenticated request against MuAPI's documented endpoint using the
    // user-supplied key. No video-generation feature is implemented here.
    try {
      const response = await fetch("https://api.muapi.ai/api/v1/models", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        return NextResponse.json(
          {
            valid: false,
            provider,
            error: `MuAPI rejected the key (HTTP ${response.status}).`,
          },
          { status: 400 },
        );
      }

      await recordKeyValidatedAt("muapi", userId);
      return NextResponse.json({ valid: true, provider });
    } catch {
      return NextResponse.json(
        {
          valid: false,
          provider,
          error: "Could not reach MuAPI to validate the key.",
        },
        { status: 400 },
      );
    }
  } catch (error) {
    appLogger.error("Error validating API key", { error });
    return NextResponse.json(
      { valid: false, error: "Failed to validate API key" },
      { status: 500 },
    );
  }
}
