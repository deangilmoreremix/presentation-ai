import { expect, test } from "@playwright/test";

test.describe("Keyboard Shortcuts", () => {
  test("should open shortcuts modal with ? key", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(500);

    await page.keyboard.press("?");

    const modal = page.locator("text=Keyboard shortcuts");
    await expect(modal).toBeVisible({ timeout: 5000 });
  });

  test("should close shortcuts modal with Escape", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(500);

    await page.keyboard.press("?");
    const modal = page.locator("text=Keyboard shortcuts");
    await expect(modal).toBeVisible({ timeout: 5000 });

    await page.keyboard.press("Escape");
    await expect(modal).not.toBeVisible();
  });
});
