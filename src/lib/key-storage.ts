/**
 * API key storage metadata.
 *
 * Credentials are NEVER stored in this browser. The only source of truth for
 * a provider key is the server-side encrypted column described in
 * `src/lib/ai/provider-credentials.ts`.
 *
 * This module intentionally persists only non-sensitive metadata: whether the
 * user has chosen to be prompted, and the timestamp of the last local
 * acknowledgement. No key material is read from or written to
 * localStorage / sessionStorage.
 */

const STORAGE_PROMPTED = "byok_prompt_dismissed";
const STORAGE_ACKNOWLEDGED = "byok_prompt_acknowledged_at";

function safeGet(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage may be unavailable (private mode, quota); metadata only.
  }
}

function safeRemove(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

/**
 * Records that the user dismissed the BYOK prompt. Kept so the app does not
 * repeatedly interrupt users who have chosen not to configure a key yet.
 */
export function dismissByokPrompt(): void {
  safeSet(STORAGE_PROMPTED, "true");
}

/** Clears the dismissed-prompt marker (e.g. after a successful save). */
export function clearByokPromptDismissal(): void {
  safeRemove(STORAGE_PROMPTED);
}

/** Whether the user has dismissed the BYOK prompt. */
export function hasByokPromptBeenDismissed(): boolean {
  return safeGet(STORAGE_PROMPTED) === "true";
}

/** Records the local acknowledgement timestamp (metadata only). */
export function acknowledgeByokPrompt(): void {
  safeSet(STORAGE_ACKNOWLEDGED, new Date().toISOString());
}

/** Returns the local acknowledgement timestamp, or null. */
export function getByokAcknowledgedAt(): string | null {
  return safeGet(STORAGE_ACKNOWLEDGED);
}
