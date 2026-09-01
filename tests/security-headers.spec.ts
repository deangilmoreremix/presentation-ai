import { expect, test } from "@playwright/test";

test.describe("Security Headers", () => {
  test("should include Content-Security-Policy header", async ({ page }) => {
    const response = await page.goto("/");
    const csp = response?.headers()["content-security-policy"];
    expect(csp).toBeTruthy();
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
  });

  test("should include X-Frame-Options DENY", async ({ page }) => {
    const response = await page.goto("/");
    const xFrame = response?.headers()["x-frame-options"];
    expect(xFrame).toBe("DENY");
  });

  test("should include X-Content-Type-Options nosniff", async ({ page }) => {
    const response = await page.goto("/");
    const xContent = response?.headers()["x-content-type-options"];
    expect(xContent).toBe("nosniff");
  });

  test("should include Referrer-Policy", async ({ page }) => {
    const response = await page.goto("/");
    const referrer = response?.headers()["referrer-policy"];
    expect(referrer).toBe("strict-origin-when-cross-origin");
  });

  test("should include Permissions-Policy", async ({ page }) => {
    const response = await page.goto("/");
    const permissions = response?.headers()["permissions-policy"];
    expect(permissions).toBeTruthy();
    expect(permissions).toContain("camera=()");
    expect(permissions).toContain("microphone=()");
  });

  test("should include HSTS in production-like environment", async ({ page }) => {
    const response = await page.goto("/");
    const hsts = response?.headers()["strict-transport-security"];
    expect(hsts).toBeTruthy();
    expect(hsts).toContain("max-age=63072000");
  });
});
