import { NextResponse } from "next/server";
import { appLogger } from "@/lib/observability/logger";
import { createClient } from "@/lib/supabase/server";
import { auth } from "@clerk/nextjs/server";
import {
  deleteProviderCredential,
  getProviderCredentialStatus,
  storeProviderCredential,
  type AiProvider,
} from "@/lib/ai/provider-credentials";
import { validateProviderKeyFormat } from "@/lib/crypto/key-encryption";

const PROVIDERS: AiProvider[] = ["openai", "muapi"];

function parseProvider(value: unknown): AiProvider | null {
  return typeof value === "string" && (PROVIDERS as string[]).includes(value)
    ? (value as AiProvider)
    : null;
}

/**
 * GET /api/user/api-key
 *
 * Returns safe status metadata only: which providers the authenticated user
 * has configured and, when known, when each key was last validated.
 *
 * This endpoint NEVER returns, masks, or derives any part of a stored
 * credential. There is deliberately no plaintext or last-4 reveal mode.
 */
export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ success: true, providers: [] });
    }

    const providers = await Promise.all(
      PROVIDERS.map(async (provider) => {
        const { configured } = await getProviderCredentialStatus(provider);
        return {
          provider,
          configured,
          ...(await readLastValidatedAt(provider)),
        };
      }),
    );

    return NextResponse.json({ success: true, providers });
  } catch (error) {
    // Never log credential material.
    appLogger.error("Error fetching API key status", { error });
    return NextResponse.json({ success: true, providers: [] });
  }
}

/** Reads only the non-sensitive `last_validated_at` metadata column. */
async function readLastValidatedAt(
  provider: AiProvider,
): Promise<{ lastValidatedAt: string | null }> {
  try {
    const supabase = await createClient();
    if (!supabase) return { lastValidatedAt: null };

    const column =
      provider === "openai"
        ? "openai_last_validated_at"
        : "muapi_last_validated_at";

    const { data, error } = await supabase
      .from("users")
      .select(column)
      .eq("id", (await auth()).userId ?? "")
      .maybeSingle<Record<string, string | null>>();

    if (error || !data) return { lastValidatedAt: null };
    const value = data[column];
    return { lastValidatedAt: value ?? null };
  } catch {
    return { lastValidatedAt: null };
  }
}

/**
 * POST /api/user/api-key
 * Body: { provider: "openai" | "muapi"; key: string }
 *
 * Encrypts and persists the authenticated user's own provider key.
 */
export async function POST(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const provider = parseProvider(body?.provider);
    const key = typeof body?.key === "string" ? body.key.trim() : "";

    if (!provider) {
      return NextResponse.json({ error: "Unsupported provider" }, { status: 400 });
    }

    if (!key) {
      return NextResponse.json({ error: "Key required" }, { status: 400 });
    }

    if (!validateProviderKeyFormat(provider, key)) {
      return NextResponse.json(
        {
          error:
            provider === "openai"
              ? "Invalid OpenAI key format. Keys start with sk- and are at least 32 characters."
              : "Invalid MuAPI key format.",
        },
        { status: 400 },
      );
    }

    await storeProviderCredential(provider, key);

    appLogger.info("Provider API key stored", { userId, provider });
    return NextResponse.json({ success: true, provider, configured: true });
  } catch (error) {
    // Never log credential material.
    appLogger.error("Error saving API key", { error });
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/user/api-key?provider=openai|muapi
 * Removes the authenticated user's stored credential for that provider.
 */
export async function DELETE(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const provider = parseProvider(
      new URL(request.url).searchParams.get("provider"),
    );

    if (!provider) {
      return NextResponse.json({ error: "Unsupported provider" }, { status: 400 });
    }

    await deleteProviderCredential(provider);

    appLogger.info("Provider API key deleted", { userId, provider });
    return NextResponse.json({ success: true, provider, configured: false });
  } catch (error) {
    appLogger.error("Error deleting API key", { error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
