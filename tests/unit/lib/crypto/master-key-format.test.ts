import { randomBytes } from "node:crypto";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { encryptApiKey, decryptApiKey } from "@/lib/crypto/key-encryption";

/**
 * Mirrors the `API_KEY_ENCRYPTION_MASTER_KEY` rule declared in `src/env.js`:
 * optional, but when present it must decode to exactly 32 bytes (base64) or be
 * 64 hex characters. `deriveKek` in `@/lib/crypto/key-encryption` is the runtime
 * enforcement point for that rule.
 */
describe("API_KEY_ENCRYPTION_MASTER_KEY format", () => {
  const userId = "master-key-user";
  const plaintext = "sk-proj-masterkeyformat1234567890abcdef";
  let originalEnv: string | undefined;

  beforeEach(() => {
    originalEnv = process.env.API_KEY_ENCRYPTION_MASTER_KEY;
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.API_KEY_ENCRYPTION_MASTER_KEY;
    } else {
      process.env.API_KEY_ENCRYPTION_MASTER_KEY = originalEnv;
    }
  });

  it("accepts a 32-byte base64 master key", async () => {
    process.env.API_KEY_ENCRYPTION_MASTER_KEY = randomBytes(32).toString("base64");
    const { encrypted, iv } = await encryptApiKey(plaintext, userId);
    await expect(decryptApiKey(encrypted, userId, iv)).resolves.toBe(plaintext);
  });

  it("accepts a 64-character hex master key", async () => {
    process.env.API_KEY_ENCRYPTION_MASTER_KEY = randomBytes(32).toString("hex");
    const { encrypted, iv } = await encryptApiKey(plaintext, userId);
    await expect(decryptApiKey(encrypted, userId, iv)).resolves.toBe(plaintext);
  });

  it("rejects a base64 master key shorter than 32 bytes", async () => {
    process.env.API_KEY_ENCRYPTION_MASTER_KEY = randomBytes(16).toString("base64");
    await expect(encryptApiKey(plaintext, userId)).rejects.toThrow(
      /API_KEY_ENCRYPTION_MASTER_KEY must be 32 bytes/
    );
  });

  it("rejects a base64 master key longer than 32 bytes", async () => {
    process.env.API_KEY_ENCRYPTION_MASTER_KEY = randomBytes(64).toString("base64");
    await expect(encryptApiKey(plaintext, userId)).rejects.toThrow(
      /API_KEY_ENCRYPTION_MASTER_KEY must be 32 bytes/
    );
  });

  it("rejects a non-base64, non-hex master key", async () => {
    process.env.API_KEY_ENCRYPTION_MASTER_KEY = "short-key";
    await expect(encryptApiKey(plaintext, userId)).rejects.toThrow(
      /API_KEY_ENCRYPTION_MASTER_KEY must be 32 bytes/
    );
  });

  it("derives a per-user key: the same master key cannot decrypt another user's ciphertext", async () => {
    process.env.API_KEY_ENCRYPTION_MASTER_KEY = randomBytes(32).toString("base64");
    const { encrypted, iv } = await encryptApiKey(plaintext, userId);
    await expect(decryptApiKey(encrypted, "another-user", iv)).rejects.toThrow();
  });
});
