import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  saveApiKey,
  getApiKey,
  removeApiKey,
  getKeyStoragePreference,
  shouldShowModal,
  getMaskedKey,
} from "@/lib/key-storage";

const STORAGE_KEY = "openai_api_key";
const STORAGE_PREFERENCE = "openai_api_key_storage";
const STORAGE_UPDATED = "openai_api_key_last_updated";

describe("key-storage", () => {
  beforeEach(() => {
    // Simulate browser environment
    const storage: Record<string, string> = {};
    const mockLocalStorage = {
      getItem: (key: string) => storage[key] ?? null,
      setItem: (key: string, value: string) => { storage[key] = value; },
      removeItem: (key: string) => { delete storage[key]; },
      clear: () => { Object.keys(storage).forEach(k => delete storage[k]); },
    };
    // @ts-ignore – override global
    global.localStorage = mockLocalStorage as Storage;
    // @ts-ignore – mock window
    global.window = {};
  });

  describe("saveApiKey (client storage)", () => {
    it("stores key in localStorage and sets preference to client", () => {
      saveApiKey("sk-test123", "client");
      expect(localStorage.getItem(STORAGE_KEY)).toBe("sk-test123");
      expect(localStorage.getItem(STORAGE_PREFERENCE)).toBe("client");
    });

    it("updates existing key", () => {
      saveApiKey("sk-oldkey", "client");
      saveApiKey("sk-newkey", "client");
      expect(getApiKey()).toBe("sk-newkey");
    });

    it("sets updatedAt timestamp", () => {
      saveApiKey("sk-test123", "client");
      const updated = localStorage.getItem(STORAGE_UPDATED);
      expect(updated).not.toBeNull();
      expect(new Date(updated!)).toBeInstanceOf(Date);
    });
  });

  describe("saveApiKey (server storage)", () => {
    it("does NOT store key in localStorage, sets preference to server", () => {
      saveApiKey("sk-secret-server-key", "server");
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
      expect(localStorage.getItem(STORAGE_PREFERENCE)).toBe("server");
    });

    it("removes any existing key from localStorage", () => {
      // First store as client
      saveApiKey("sk-client-key", "client");
      expect(getApiKey()).toBe("sk-client-key");
      // Switch to server storage
      saveApiKey("sk-server-key", "server");
      expect(getApiKey()).toBeNull();
      expect(getKeyStoragePreference()).toBe("server");
    });
  });

  describe("getApiKey", () => {
    it("returns stored key", () => {
      localStorage.setItem(STORAGE_KEY, "sk-getkey");
      expect(getApiKey()).toBe("sk-getkey");
    });

    it("returns null when no key stored", () => {
      expect(getApiKey()).toBeNull();
    });
  });

  describe("removeApiKey", () => {
    it("clears all key-related storage", () => {
      saveApiKey("sk-toremove", "client");
      removeApiKey();
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
      expect(localStorage.getItem(STORAGE_PREFERENCE)).toBeNull();
      expect(localStorage.getItem(STORAGE_UPDATED)).toBeNull();
    });
  });

  describe("getKeyStoragePreference", () => {
    it("defaults to 'client' if not set", () => {
      expect(getKeyStoragePreference()).toBe("client");
    });

    it("returns stored preference", () => {
      localStorage.setItem(STORAGE_PREFERENCE, "server");
      expect(getKeyStoragePreference()).toBe("server");
    });

    it("treats invalid values as 'client'", () => {
      localStorage.setItem(STORAGE_PREFERENCE, "invalid");
      expect(getKeyStoragePreference()).toBe("client");
    });
  });

  describe("shouldShowModal", () => {
    it("returns true when no key present", () => {
      expect(shouldShowModal()).toBe(true);
    });

    it("returns false when client key present", () => {
      saveApiKey("sk-hasclient", "client");
      expect(shouldShowModal()).toBe(false);
    });

    it("returns true when preference is server (no local key)", () => {
      saveApiKey("sk-key", "server");
      expect(shouldShowModal()).toBe(true);
    });
  });

  describe("getMaskedKey", () => {
    it("returns masked key showing last 4 chars", () => {
      saveApiKey("sk-proj-ABCD1234EFGH", "client");
      expect(getMaskedKey()).toBe("sk-...EFGH");
    });

    it("handles short keys gracefully", () => {
      saveApiKey("sk-short", "client");
      // key length < 5? Actually our masking uses slice(-4). If key shorter than 4 chars, returns empty?
      // Implementation: key.slice(-4) on "sk-short" -> "hort"? Actually length 8, returns last 4 "hort"
      // But prefix is "sk-" -> result "sk-...hort"
      expect(getMaskedKey()).toBe("sk-...hort");
    });

    it("returns null when no key", () => {
      expect(getMaskedKey()).toBeNull();
    });
  });
});
