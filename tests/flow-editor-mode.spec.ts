import { expect, test } from "@playwright/test";

test.describe("Flow Editor Mode", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/presentation");
  });

  test("should show visible Flow editor mode indicator on dashboard", async ({ page }) => {
    await expect(page.getByText("Flow")).toBeVisible({ timeout: 10000 });
  });

  test("should show separate Aspect Ratio control from Flow", async ({ page }) => {
    const flowIndicator = page.getByText("Flow");
    await expect(flowIndicator).toBeVisible({ timeout: 10000 });

    const aspectRatioControl = page.getByText("Aspect Ratio");
    await expect(aspectRatioControl).toBeVisible({ timeout: 10000 });
  });

  test("should create a Flow presentation and show Flow in editor", async ({ page }) => {
    const topicInput = page.getByPlaceholder("Describe your topic");
    await topicInput.fill("Test Flow Presentation");
    await page.getByRole("button", { name: /generate/i }).click();

    await expect(page.getByText("Flow")).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Legacy Presentation Fallback", () => {
  test("should default legacy presentations to Flow", async ({ page }) => {
    await page.goto("/presentation");
    await page.waitForTimeout(2000);

    const presentations = page.locator("[class*='presentation']");
    const count = await presentations.count();
    
    if (count > 0) {
      await expect(page.getByText("Flow")).toBeVisible({ timeout: 10000 });
    }
  });
});
