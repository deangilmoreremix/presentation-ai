import { describe, it, expect, beforeEach, vi } from "vitest";
import { apiRateLimiter, authRateLimiter } from "@/lib/security/rate-limit";

describe("Rate Limiting", () => {
  beforeEach(() => {
    // Reset rate limiter state between tests
    vi.useFakeTimers();
  });

  describe("API Rate Limiter", () => {
    it("should allow requests within limit", () => {
      const clientIP = "192.168.1.1";

      // Should allow first 100 requests
      for (let i = 0; i < 100; i++) {
        expect(apiRateLimiter.isRateLimited(clientIP)).toBe(false);
      }
    });

    it("should block requests over limit", () => {
      const clientIP = "192.168.1.1";

      // Use up the limit
      for (let i = 0; i < 100; i++) {
        apiRateLimiter.isRateLimited(clientIP);
      }

      // Next request should be blocked
      expect(apiRateLimiter.isRateLimited(clientIP)).toBe(true);
    });

    it("should reset limit after window expires", () => {
      const clientIP = "192.168.1.1";

      // Use up the limit
      for (let i = 0; i < 100; i++) {
        apiRateLimiter.isRateLimited(clientIP);
      }

      // Advance time by 15 minutes (window duration)
      vi.advanceTimersByTime(15 * 60 * 1000);

      // Should allow requests again
      expect(apiRateLimiter.isRateLimited(clientIP)).toBe(false);
    });
  });

  describe("Auth Rate Limiter", () => {
    it("should allow auth attempts within limit", () => {
      const clientIP = "192.168.1.1";

      // Should allow first 5 auth attempts
      for (let i = 0; i < 5; i++) {
        expect(authRateLimiter.isRateLimited(clientIP)).toBe(false);
      }
    });

    it("should block excessive auth attempts", () => {
      const clientIP = "192.168.1.1";

      // Use up the limit
      for (let i = 0; i < 5; i++) {
        authRateLimiter.isRateLimited(clientIP);
      }

      // Next attempt should be blocked
      expect(authRateLimiter.isRateLimited(clientIP)).toBe(true);
    });
  });
});