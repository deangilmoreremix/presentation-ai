import { test as setup, expect } from "@playwright/test";

const authFile = "./tests/.auth/user.json";

setup("authenticate", async ({ page }) => {
  await page.goto("/presentation");

  // If the app is already authenticated, skip sign-in.
  if (await page.locator("text=Sign out").isVisible({ timeout: 1000 }).catch(() => false)) {
    await page.context().storageState({ path: authFile });
    return;
  }

  await expect(page.getByText("Presentations")).toBeVisible({ timeout: 30000 });
  await page.context().storageState({ path: authFile });
});
