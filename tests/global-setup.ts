import { chromium } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const authFile = path.join(__dirname, ".auth", "user.json");

async function globalSetup() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ baseURL: "http://localhost:3000" });
  const page = await context.newPage();

  await page.goto("/auth/signin");

  // If the app is already authenticated, save state and exit.
  if (await page.locator("text=Sign out").isVisible({ timeout: 1000 }).catch(() => false)) {
    await context.storageState({ path: authFile });
    await browser.close();
    return;
  }

  const testEmail = process.env.PLAYWRIGHT_TEST_EMAIL;
  const testPassword = process.env.PLAYWRIGHT_TEST_PASSWORD;

  if (!testEmail || !testPassword) {
    console.error(
      "Missing PLAYWRIGHT_TEST_EMAIL or PLAYWRIGHT_TEST_PASSWORD. " +
        "Create a test user in the Clerk test instance and set these environment variables."
    );
    await browser.close();
    process.exit(1);
  }

  await page.getByPlaceholder(/email/i).fill(testEmail);
  await page.getByPlaceholder(/password/i).fill(testPassword);
  await page.getByRole("button", { name: /sign in/i }).click();

  await page.waitForURL("http://localhost:3000/presentation", { timeout: 30000 });
  await context.storageState({ path: authFile });
  await browser.close();
}

export default globalSetup;
