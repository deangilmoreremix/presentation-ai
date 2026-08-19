import { NextResponse } from "next/server";
import { appLogger } from "@/lib/observability/logger";
import { decryptApiKey, encryptApiKey, validateKeyFormat } from "@/lib/crypto/key-encryption";
import { db } from "@/server/db";
import { auth } from "@clerk/nextjs/server";

/**
 * GET /api/user/api-key
 * Returns the masked server-stored key for authenticated users.
 * Anonymous users receive a client-only response.
 */
export async function GET(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ success: true, maskedKey: null, storage: "none" });
    }

    try {
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { openaiApiKeyEncrypted: true, openaiApiKeyIv: true },
      });

      if (!user?.openaiApiKeyEncrypted || !user?.openaiApiKeyIv) {
        return NextResponse.json({ success: true, maskedKey: null, storage: "none" });
      }

      try {
        const decrypted = await decryptApiKey(user.openaiApiKeyEncrypted, userId, user.openaiApiKeyIv);
        const maskedKey = decrypted.length >= 4 ? `sk-...${decrypted.slice(-4)}` : "sk-";
        const url = new URL(request.url);
        const revealRaw = url.searchParams.get("raw") === "true";
        if (revealRaw) {
          return NextResponse.json({ success: true, rawKey: decrypted, storage: "server" });
        }
        return NextResponse.json({ success: true, maskedKey, storage: "server" });
      } catch (error) {
        appLogger.error("Failed to decrypt API key", { error });
        return NextResponse.json({ success: true, maskedKey: null, storage: "none" });
      }
    } catch (error) {
      appLogger.error("Error fetching API key", { error });
      return NextResponse.json({ success: true, maskedKey: null, storage: "none" });
    }
  } catch (error) {
    appLogger.error("Error fetching API key", { error });
    return NextResponse.json({ success: true, maskedKey: null, storage: "none" });
  }
}

/**
 * POST /api/user/api-key
 * Body: { key: string; storage: "client" | "server" }
 * Authenticated users: server storage encrypts and persists to DB; client storage clears DB copy.
 * Anonymous users: server storage is rejected; client storage is a no-op (handled client-side).
 */
export async function POST(request: Request) {
  try {
    const { userId } = await auth();

    const body = await request.json();
    const { key, storage } = body as { key: string; storage: "client" | "server" };

    if (!key || key.trim().length === 0) {
      return NextResponse.json({ error: "Key required" }, { status: 400 });
    }

    if (!validateKeyFormat(key)) {
      return NextResponse.json({ error: "Invalid API key format" }, { status: 400 });
    }

    if (storage === "server" && userId) {
      try {
        const { encrypted, iv } = await encryptApiKey(key, userId);
        await db.user.update({
          where: { id: userId },
          data: { openaiApiKeyEncrypted: encrypted, openaiApiKeyIv: iv },
        });
        appLogger.info("API key encrypted and saved", { userId });
        return NextResponse.json({ success: true });
      } catch (error) {
        appLogger.error("Encryption failed", { error });
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
      }
    }

    // Client storage or anonymous user: clear any server-side copy
    if (userId) {
      await db.user.update({
        where: { id: userId },
        data: { openaiApiKeyEncrypted: null, openaiApiKeyIv: null },
      });
      appLogger.info("Client-only storage selected, server copy cleared", { userId });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    appLogger.error("Error processing API key", { error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/user/api-key
 * Deletes the server-stored key for authenticated users.
 * Anonymous users receive a success response without DB changes.
 */
export async function DELETE() {
  try {
    const { userId } = await auth();

    if (userId) {
      try {
        await db.user.update({
          where: { id: userId },
          data: { openaiApiKeyEncrypted: null, openaiApiKeyIv: null },
        });
        appLogger.info("API key deleted", { userId });
      } catch (error) {
        appLogger.error("Error deleting API key", { error });
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    appLogger.error("Error deleting API key", { error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
