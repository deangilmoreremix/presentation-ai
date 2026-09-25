import { test as setup, expect } from "@playwright/test";

const authFile = "./tests/.auth/user.json";

setup("authenticate", async ({ page }) => {
  await page.goto("/auth/signin");

  // If the app is already authenticated, skip sign-in.
  if (await page.locator("text=Sign out").isVisible({ timeout: 1000 }).catch(() => false)) {
    await page.context().storageState({ path: authFile });
    return;
  }

  // TODO: Replace with actual test user credentials for the Clerk test instance.
  // Required environment variables:
  // - PLAYWRIGHT_TEST_EMAIL
  // - PLAYWRIGHT_TEST_PASSWORD
  const testEmail = process.env.PLAYWRIGHT_TEST_EMAIL;
  const testPassword = process.env.PLAYWRIGHT_TEST_PASSWORD;

  if (!testEmail || !testPassword) {
    throw new Error(
      "Missing PLAYWRIGHT_TEST_EMAIL or PLAYWRIGHT_TEST_PASSWORD. " +
        "Create a test user in the Clerk test instance and set these environment variables."
    );
  }

  await page.getByPlaceholder(/email/i).fill(testEmail);
  await page.getByPlaceholder(/password/i).fill(testPassword);
  await page.getByRole("button", { name: /sign in/i }).click();

  await expect(page.getByText("Presentations")).toBeVisible({ timeout: 30000 });
  await page.context().storageState({ path: authFile });
});
