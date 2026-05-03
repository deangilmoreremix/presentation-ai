import { expect, test } from "@playwright/test";

test.describe("Presentation Creation Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/presentation/create");
  });

  test("should show presentation creation form", async ({ page }) => {
    await expect(page.getByPlaceholder("Enter your topic")).toBeVisible({
      timeout: 10000,
    });
  });

  test("should allow entering a presentation topic", async ({ page }) => {
    const topicInput = page.getByPlaceholder("Enter your topic");
    await topicInput.fill("Test Presentation Topic");
    await expect(topicInput).toHaveValue("Test Presentation Topic");
  });

  test("should have slide count selector", async ({ page }) => {
    const slideSelector = page.getByLabel(/number of slides|slide count/i);
    await expect(slideSelector).toBeVisible();
  });

  test("should have theme selector", async ({ page }) => {
    const themeSelector = page.getByText(/select theme|choose theme/i);
    await expect(themeSelector.first()).toBeVisible();
  });
});

test.describe("Presentation Editor", () => {
  test("should have toolbar with basic actions", async ({ page }) => {
    await page.goto("/presentation");
    await page.waitForTimeout(2000);

    await expect(
      page
        .getByRole("button", { name: /add slide/i })
        .or(page.getByRole("button", { name: /new slide/i })),
    ).toBeVisible({ timeout: 10000 });
  });

  test("should show slide thumbnails", async ({ page }) => {
    await page.goto("/presentation");
    await page.waitForTimeout(2000);

    const slideThumbnails = page.locator("[class*='slide']").first();
    await expect(slideThumbnails).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Export Dialog", () => {
  test("should show export format options", async ({ page }) => {
    await page.goto("/presentation");
    await page.waitForTimeout(2000);

    const exportButton = page.getByRole("button", { name: /export/i }).first();
    await exportButton.click();

    await expect(page.getByText("PowerPoint (.pptx)")).toBeVisible();
    await expect(page.getByText("PDF Document (.pdf)")).toBeVisible();
  });

  test("should allow selecting PDF export", async ({ page }) => {
    await page.goto("/presentation");
    await page.waitForTimeout(2000);

    const exportButton = page.getByRole("button", { name: /export/i }).first();
    await exportButton.click();

    const pdfOption = page.getByLabel("PDF Document (.pdf)");
    await pdfOption.click();

    const exportButtonInDialog = page.getByRole("button", {
      name: /export to pdf/i,
    });
    await expect(exportButtonInDialog).toBeVisible();
  });
});

test.describe("Accessibility", () => {
  test("should have proper heading structure", async ({ page }) => {
    await page.goto("/");
    const h1 = page.locator("h1");
    await expect(h1.first()).toBeVisible();
  });

  test("should have accessible forms", async ({ page }) => {
    await page.goto("/presentation/create");

    const inputs = page.getByRole("textbox");
    const count = await inputs.count();
    expect(count).toBeGreaterThan(0);
  });

  test("should have accessible buttons", async ({ page }) => {
    await page.goto("/");
    const buttons = page.getByRole("button");
    const count = await buttons.count();
    expect(count).toBeGreaterThan(0);
  });

  test("should have accessible links", async ({ page }) => {
    await page.goto("/");
    const links = page.getByRole("link");
    const count = await links.count();
    expect(count).toBeGreaterThan(0);
  });
});

test.describe("Responsive Design", () => {
  test("should work on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");

    await expect(
      page.getByRole("link", { name: /create|generate/i }).first(),
    ).toBeVisible();
  });

  test("should work on tablet viewport", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/");

    await expect(
      page.getByRole("link", { name: /create|generate/i }).first(),
    ).toBeVisible();
  });

  test("should work on desktop viewport", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto("/");

    await expect(
      page.getByRole("link", { name: /create|generate/i }).first(),
    ).toBeVisible();
  });
});
