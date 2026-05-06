import { describe, it, expect, beforeEach, vi } from "vitest";
import { encryptApiKey, decryptApiKey, validateKeyFormat } from "@/lib/crypto/key-encryption";

describe("key-encryption", () => {
  const userId = "test-user-123";
  let originalEnv: string | undefined;

  beforeEach(() => {
    // Use a deterministic 32-byte base64 master key for tests
    originalEnv = process.env.API_KEY_ENCRYPTION_MASTER_KEY;
    process.env.API_KEY_ENCRYPTION_MASTER_KEY = "qfsLK4XeihpDFi+YWVK2wg+43pL8gsUcYY9b5Q7xWq0="; // base64 32-byte
  });

  afterEach(() => {
    process.env.API_KEY_ENCRYPTION_MASTER_KEY = originalEnv;
  });

  describe("validateKeyFormat", () => {
    it("accepts valid alphanumeric OpenAI API keys with sk- prefix", () => {
      const validKey = "sk-" + "a".repeat(32);
      expect(validateKeyFormat(validKey)).toBe(true);
    });

    it("accepts mixed-case alphanumeric keys", () => {
      const validKey = "sk-ProjABC123" + "x".repeat(22);
      expect(validateKeyFormat(validKey)).toBe(true);
    });

    it("rejects keys without sk- prefix", () => {
      expect(validateKeyFormat("proj-abcdefghijklmnopqrstuvwxyz")).toBe(false);
    });

    it("rejects keys that are too short (<32 chars after sk-)", () => {
      expect(validateKeyFormat("sk-abc")).toBe(false);
    });

    it("rejects empty string", () => {
      expect(validateKeyFormat("")).toBe(false);
    });

    it("rejects keys with special characters", () => {
      expect(validateKeyFormat("sk-abc-def")).toBe(false);
      expect(validateKeyFormat("sk-abc@def!")).toBe(false);
    });

    it("accepts the real key format used by OpenAI", () => {
      const realLike = "sk-proj-0EacHVgF5RqaiVjmcg3MaSEUQx7FD1PETWLP18HnGxbGElICdxeldFVVy";
      expect(validateKeyFormat(realLike)).toBe(true);
    });
  });

  describe("encryptApiKey / decryptApiKey", () => {
    it("round trip: encrypt then decrypt returns original", async () => {
      const originalKey = "sk-proj-abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGH";
      const result = await encryptApiKey(originalKey, userId);
      const decrypted = await decryptApiKey(result.encrypted, userId, result.iv);
      expect(decrypted).toBe(originalKey);
    });

    it("different calls produce different ciphertexts (random IV)", async () => {
      const originalKey = "sk-proj-testkey1234567890abcdefghijklmnopqrstuvwxyz";
      const result1 = await encryptApiKey(originalKey, userId);
      const result2 = await encryptApiKey(originalKey, userId);
      expect(result1.encrypted).not.toBe(result2.encrypted);
      expect(result1.iv).not.toBe(result2.iv);
    });

    it("different IVs yield different ciphertexts but same decrypted value", async () => {
      const originalKey = "sk-proj-fixedkey1234567890abcdefghijklmnopq";
      const result1 = await encryptApiKey(originalKey, userId);
      const result2 = await encryptApiKey(originalKey, userId);
      const decrypted1 = await decryptApiKey(result1.encrypted, userId, result1.iv);
      const decrypted2 = await decryptApiKey(result2.encrypted, userId, result2.iv);
      expect(decrypted1).toBe(decrypted2);
      expect(result1.encrypted).not.toBe(result2.encrypted);
    });

    it("wrong user ID fails decryption", async () => {
      const originalKey = "sk-proj-test1234567890abcdefghijklmnopqrstuvwxyz";
      const result = await encryptApiKey(originalKey, userId);
      const wrongUserId = "different-user";
      await expect(decryptApiKey(result.encrypted, wrongUserId, result.iv))
        .rejects.toThrow();
    });

    it("tampered ciphertext throws error", async () => {
      const originalKey = "sk-proj-tampertest1234567890abcdefghijklmnopq";
      const result = await encryptApiKey(originalKey, userId);
      const tamperedCiphertext = result.encrypted.slice(0, -10) + "AAAAAAAAAA";
      await expect(decryptApiKey(tamperedCiphertext, userId, result.iv))
        .rejects.toThrow();
    });

    it("tampered IV throws error", async () => {
      const originalKey = "sk-proj-tampertest1234567890abcdefghijklmnopq";
      const result = await encryptApiKey(originalKey, userId);
      const tamperedIv = result.iv.slice(0, -10) + "BBBBBBBBBB";
      await expect(decryptApiKey(result.encrypted, userId, tamperedIv))
        .rejects.toThrow();
    });

    it("invalid base64 ciphertext throws error", async () => {
      const invalidCiphertext = "not-valid-base64!!!";
      await expect(decryptApiKey(invalidCiphertext, userId, "validIvBase64"))
        .rejects.toThrow();
    });

    it("invalid base64 IV throws error", async () => {
      const originalKey = "sk-proj-test1234567890abcdefghijklmnopqrstuvwxyz";
      const result = await encryptApiKey(originalKey, userId);
      await expect(decryptApiKey(result.encrypted, userId, "not-valid-iv!!!"))
        .rejects.toThrow();
    });

    it("throws error when master key env var is missing", async () => {
      const originalEnv = process.env.API_KEY_ENCRYPTION_MASTER_KEY;
      delete process.env.API_KEY_ENCRYPTION_MASTER_KEY;
      await expect(encryptApiKey('sk-proj-testkey', userId))
        .rejects.toThrow('API_KEY_ENCRYPTION_MASTER_KEY');
      process.env.API_KEY_ENCRYPTION_MASTER_KEY = originalEnv;
    });

    it("handles empty plaintext", async () => {
      const result = await encryptApiKey("", userId);
      const decrypted = await decryptApiKey(result.encrypted, userId, result.iv);
      expect(decrypted).toBe("");
    });

    it("handles special characters in API key", async () => {
      const originalKey = "sk-proj-!@#$%^&*()_+-=[]{}|;:,.<>?";
      const result = await encryptApiKey(originalKey, userId);
      const decrypted = await decryptApiKey(result.encrypted, userId, result.iv);
      expect(decrypted).toBe(originalKey);
    });
  });
});
