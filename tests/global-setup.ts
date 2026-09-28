import { chromium } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const authFile = path.join(__dirname, ".auth", "user.json");

async function globalSetup() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ baseURL: "http://localhost:3000" });
  const page = await context.newPage();

  await page.goto("/presentation", { timeout: 120000 });

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

  const clerkSecretKey = process.env.CLERK_SECRET_KEY;
  if (!clerkSecretKey) {
    console.error("Missing CLERK_SECRET_KEY environment variable");
    await browser.close();
    process.exit(1);
  }

  // Look up the test user and create a backend session directly.
  // This avoids the Clerk dev-mode client-trust page entirely.
  const userResponse = await fetch(
    `https://api.clerk.com/v1/users?email_address=${encodeURIComponent(testEmail)}`,
    {
      headers: {
        Authorization: `Bearer ${clerkSecretKey}`,
      },
    }
  );

  if (!userResponse.ok) {
    throw new Error(`Failed to look up test user: ${userResponse.status}`);
  }

  const users = await userResponse.json();
  const testUser = users[0];

  if (!testUser?.id) {
    throw new Error(`Test user not found for ${testEmail}`);
  }

  const sessionResponse = await fetch("https://api.clerk.com/v1/sessions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${clerkSecretKey}`,
    },
    body: JSON.stringify({ user_id: testUser.id }),
  });

  if (!sessionResponse.ok) {
    throw new Error(`Failed to create session: ${sessionResponse.status}`);
  }

  const session = await sessionResponse.json();

  const tokenResponse = await fetch(
    `https://api.clerk.com/v1/sessions/${session.id}/tokens`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${clerkSecretKey}`,
      },
    }
  );

  if (!tokenResponse.ok) {
    throw new Error(`Failed to create session token: ${tokenResponse.status}`);
  }

  const tokenData = await tokenResponse.json();

  await context.addCookies([
    {
      name: "__session",
      value: tokenData.jwt,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    },
  ]);

  await page.goto("/presentation", { timeout: 120000 });
  await page.waitForURL((url) => url.href.includes("/presentation"), { timeout: 30000 });
  await page.waitForTimeout(2000);
  await context.storageState({ path: authFile });
  await browser.close();
}

export default globalSetup;
