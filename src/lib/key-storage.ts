/**
 * Client-side API key storage using localStorage.
 * Keys are stored in plain text (client-only mode).
 * For server-side encrypted storage, use encryption module.
 */

const STORAGE_KEY = "openai_api_key";
const STORAGE_PREFERENCE = "openai_api_key_storage"; // "client" | "server"
const STORAGE_UPDATED = "openai_api_key_last_updated";

export interface StoredKey {
  key: string;
  storage: "client" | "server";
  updatedAt: string;
}

/**
 * Saves the API key to localStorage with metadata.
 * @param key - The OpenAI API key (sk-...)
 * @param storage - "client" stores in localStorage; "server" clears localStorage and sets preference only
 */
export function saveApiKey(key: string, storage: "client" | "server" = "client"): void {
  if (typeof window === "undefined") return;

  const stored: StoredKey = {
    key,
    storage,
    updatedAt: new Date().toISOString(),
  };

  try {
    if (storage === "client") {
      localStorage.setItem(STORAGE_KEY, key);
    } else {
      // Server storage: ensure no local copy
      localStorage.removeItem(STORAGE_KEY);
    }
    localStorage.setItem(STORAGE_PREFERENCE, stored.storage);
    localStorage.setItem(STORAGE_UPDATED, stored.updatedAt);
  } catch (error) {
    if (error instanceof Error && error.message.includes("quota")) {
      console.warn("localStorage quota exceeded; could not save API key");
    } else {
      console.error("Failed to save API key to localStorage:", error);
    }
  }
}

/**
 * Retrieves the stored API key from localStorage.
 * Returns null if not present.
 */
export function getApiKey(): string | null {
  if (typeof window === "undefined") return null;

  try {
    const key = localStorage.getItem(STORAGE_KEY);
    return key;
  } catch (error) {
    console.error("Failed to read API key from localStorage:", error);
    return null;
  }
}

/**
 * Removes the API key from localStorage and clears preference.
 */
export function removeApiKey(): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_PREFERENCE);
    localStorage.removeItem(STORAGE_UPDATED);
  } catch (error) {
    console.error("Failed to remove API key from localStorage:", error);
  }
}

/**
 * Gets the user's storage preference.
 * Defaults to "client" if not set.
 */
export function getKeyStoragePreference(): "client" | "server" {
  if (typeof window === "undefined") return "client";

  try {
    const pref = localStorage.getItem(STORAGE_PREFERENCE);
    return (pref === "server" ? "server" : "client") as "client" | "server";
  } catch {
    return "client";
  }
}

/**
 * Determines if the API key modal should be shown.
 * Returns true if no key is present in localStorage AND user hasn't explicitly set server storage preference
 * (but server preference implies key stored in DB, not localStorage; we can't know without checking server).
 *
 * This helper is used client-side to decide whether to prompt user.
 * It only checks localStorage, not server DB. The server preference indicates user intended to store on server,
 * but actual presence of server key is unknown client-side. Therefore modal may still appear if user hasn't set server key yet.
 *
 * Recommended usage: Check this after sign-in; if false (no key), show modal on first generation attempt.
 */
export function shouldShowModal(): boolean {
  const key = getApiKey();
  return key === null;
}

/**
 * Returns a masked version of the API key showing only last 4 characters.
 * Example: "sk-...abcd"
 */
export function getMaskedKey(): string | null {
  const key = getApiKey();
  if (!key) return null;

  if (key.length < 5) return "sk-";
  const lastFour = key.slice(-4);
  return `sk-...${lastFour}`;
}

/**
 * Gets the last updated timestamp for the key (if available).
 */
export function getKeyLastUpdated(): string | null {
  if (typeof window === "undefined") return null;

  try {
    return localStorage.getItem(STORAGE_UPDATED);
  } catch {
    return null;
  }
}
