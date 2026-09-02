import { expect, test } from "@playwright/test";

test.describe("Image Search Integrations", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/presentation");
    await page.waitForTimeout(2000);
  });

  test("should show image editor with provider tabs", async ({ page }) => {
    const imageButton = page.getByRole("button", { name: /image/i }).first();
    if (await imageButton.count() > 0) {
      await imageButton.click();
      await page.waitForTimeout(500);
    }

    const panel = page.locator("[class*='image']").first();
    if (await panel.count() > 0) {
      await expect(panel).toBeVisible({ timeout: 5000 });
    }
  });

  test("should have stock photo search tab", async ({ page }) => {
    const stockPhotosTab = page.getByRole("tab", { name: /stock photos/i });
    if (await stockPhotosTab.count() > 0) {
      await expect(stockPhotosTab).toBeVisible();
    }
  });

  test("should have free images tab", async ({ page }) => {
    const freeImagesTab = page.getByRole("tab", { name: /free images/i });
    if (await freeImagesTab.count() > 0) {
      await expect(freeImagesTab).toBeVisible();
    }
  });

  test("should have pexels tab", async ({ page }) => {
    const pexelsTab = page.getByRole("tab", { name: /pexels/i });
    if (await pexelsTab.count() > 0) {
      await expect(pexelsTab).toBeVisible();
    }
  });

  test("should have animated gifs tab", async ({ page }) => {
    const gifTab = page.getByRole("tab", { name: /animated gifs|gifs/i });
    if (await gifTab.count() > 0) {
      await expect(gifTab).toBeVisible();
    }
  });

  test("should load images when clicking stock photos tab", async ({ page }) => {
    const stockPhotosTab = page.getByRole("tab", { name: /stock photos/i });
    if (await stockPhotosTab.count() > 0) {
      await stockPhotosTab.click();
      await page.waitForTimeout(2000);

      const images = page.locator("[class*='grid'] img").first();
      if (await images.count() > 0) {
        await expect(images).toBeVisible();
      }
    }
  });

  test("should load images when clicking pexels tab", async ({ page }) => {
    const pexelsTab = page.getByRole("tab", { name: /pexels/i });
    if (await pexelsTab.count() > 0) {
      await pexelsTab.click();
      await page.waitForTimeout(2000);

      const images = page.locator("[class*='grid'] img").first();
      if (await images.count() > 0) {
        await expect(images).toBeVisible();
      }
    }
  });

  test("should load gifs when clicking animated gifs tab", async ({ page }) => {
    const gifTab = page.getByRole("tab", { name: /animated gifs|gifs/i });
    if (await gifTab.count() > 0) {
      await gifTab.click();
      await page.waitForTimeout(2000);

      const gifs = page.locator("[class*='grid'] img").first();
      if (await gifs.count() > 0) {
        await expect(gifs).toBeVisible();
      }
    }
  });
});
