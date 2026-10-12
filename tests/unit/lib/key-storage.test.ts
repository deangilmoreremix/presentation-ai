import { describe, it, expect } from "vitest";
import {
  dismissByokPrompt,
  clearByokPromptDismissal,
  hasByokPromptBeenDismissed,
  acknowledgeByokPrompt,
  getByokAcknowledgedAt,
} from "@/lib/key-storage";

/**
 * BYOK storage-safety regression tests.
 *
 * The critical invariant: no credential material is ever written to
 * localStorage or sessionStorage. This module only persists non-sensitive
 * prompt metadata.
 */
describe("key-storage (BYOK metadata only)", () => {
  describe("prompt metadata", () => {
    it("persists only non-sensitive keys", () => {
      dismissByokPrompt();

      const keys = Object.keys(window.localStorage);
      expect(keys.length).toBeGreaterThan(0);
      for (const key of keys) {
        expect(key).not.toContain("api_key");
        expect(key).not.toContain("apikey");
        expect(key.startsWith("sk-")).toBe(false);
      }
    });

    it("tracks dismissal state", () => {
      window.localStorage.clear();
      expect(hasByokPromptBeenDismissed()).toBe(false);

      dismissByokPrompt();
      expect(hasByokPromptBeenDismissed()).toBe(true);

      clearByokPromptDismissal();
      expect(hasByokPromptBeenDismissed()).toBe(false);
    });

    it("records an acknowledgement timestamp as metadata only", () => {
      window.localStorage.clear();
      expect(getByokAcknowledgedAt()).toBeNull();

      acknowledgeByokPrompt();
      const stamp = getByokAcknowledgedAt();
      expect(stamp).toBeTruthy();
      // ISO timestamp, not a credential.
      expect(() => new Date(stamp as string)).not.toThrow();
      expect(stamp?.startsWith("sk-")).toBe(false);
    });

    it("never creates a key-shaped localStorage entry", () => {
      window.localStorage.clear();

      // Any legacy plaintext key left behind by an older build of the app.
      window.localStorage.setItem(
        "openai_api_key",
        "sk-super-secret-value-1234567890",
      );
      const legacyBefore = window.localStorage.getItem("openai_api_key");

      dismissByokPrompt();
      acknowledgeByokPrompt();

      // This module only ever writes its own non-sensitive keys, and never
      // copies, re-emits, or rewrites a key-shaped value.
      const writtenKeys = Object.keys(window.localStorage).filter(
        (k) => k === "byok_prompt_dismissed" || k === "byok_prompt_acknowledged_at",
      );
      expect(writtenKeys).toHaveLength(2);
      // The legacy entry is untouched (not read, not rewritten, not echoed).
      expect(window.localStorage.getItem("openai_api_key")).toBe(legacyBefore);
      // No accessor returns key-shaped material.
      expect(hasByokPromptBeenDismissed()).toBe(true);
      expect(getByokAcknowledgedAt()).not.toContain("sk-");
    });
  });
});
