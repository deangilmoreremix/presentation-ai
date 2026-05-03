import { expect, test } from "@playwright/test";

test.describe("Landing Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should load the landing page without errors", async ({ page }) => {
    await expect(page).toHaveTitle(/ALLWEONE|presentation/i);
  });

  test("should show sign in button", async ({ page }) => {
    const signInButton = page.getByRole("link", { name: /sign in/i });
    await expect(signInButton).toBeVisible();
  });

  test("should show create presentation button", async ({ page }) => {
    const createButton = page.getByRole("link", { name: /create|generate/i });
    await expect(createButton.first()).toBeVisible();
  });
});

test.describe("Authentication", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/auth/signin");
  });

  test("should show sign in page", async ({ page }) => {
    await expect(page.getByText("Sign in to your account")).toBeVisible();
  });

  test("should have Google sign in option", async ({ page }) => {
    const googleButton = page.getByRole("button", { name: /google/i });
    await expect(googleButton).toBeVisible();
  });
});

test.describe("Presentation Editor", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/presentation");
  });

  test("should show presentations list or empty state", async ({ page }) => {
    await expect(
      page
        .getByText(/no presentations|create your first/i)
        .or(page.getByRole("heading", { name: /presentations/i })),
    ).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Export Functionality", () => {
  test("should show export button in editor", async ({ page }) => {
    await page.goto("/presentation");

    await page.waitForTimeout(3000);

    const exportButton = page.getByRole("button", { name: /export/i });
    await expect(exportButton.first()).toBeVisible({ timeout: 10000 });
  });
});
