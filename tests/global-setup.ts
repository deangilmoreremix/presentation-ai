import { chromium } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const authFile = path.join(__dirname, ".auth", "user.json");

async function globalSetup() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ baseURL: "http://localhost:3000" });
  const page = await context.newPage();

  await page.goto("/presentation");

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

  // Use Clerk API to create session directly
  const apiUrl = "https://api.clerk.com/v1/client/sign_in";
  console.log("Attempting Clerk API sign-in:", apiUrl);

  try {
    const signInResponse = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${clerkSecretKey}`,
      },
      body: JSON.stringify({
        identifier: testEmail,
        password: testPassword,
      }),
    });

    console.log("API response status:", signInResponse.status);
    const responseText = await signInResponse.text();
    console.log("API response body:", responseText);

    if (signInResponse.ok) {
      const signInData = JSON.parse(responseText);
      console.log("Sign-in data status:", signInData.status);

      if (signInData.status === "complete" && signInData.created_session_id) {
        // Get session token
        const tokenResponse = await fetch(
          `https://api.clerk.com/v1/client/sessions/${signInData.created_session_id}/tokens`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${clerkSecretKey}`,
            },
          }
        );

        console.log("Token API response status:", tokenResponse.status);
        const tokenText = await tokenResponse.text();
        console.log("Token API response body:", tokenText);

        if (tokenResponse.ok) {
          const tokenData = JSON.parse(tokenText);
          console.log("Got session token");

          // Set the session cookie
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

          await page.goto("/presentation");
          await page.waitForURL((url) => url.href.includes("/presentation"), { timeout: 30000 });
          await page.waitForTimeout(2000);
          await context.storageState({ path: authFile });
          console.log("Successfully authenticated via API");
          await browser.close();
          return;
        }
      }
    }

    console.error("API auth failed, falling back to UI");
  } catch (error) {
    console.error("API auth error:", error);
  }

  // Fallback: UI automation
  await page.goto("/auth/signin");
  await page.waitForTimeout(3000);

  try {
    await page.getByPlaceholder(/email/i).fill(testEmail);
    await page.getByRole("button", { name: /continue/i }).click();
    await page.waitForSelector('input[type="password"]', { timeout: 10000 });
    await page.getByPlaceholder(/password/i).fill(testPassword);
    await page.getByRole("button", { name: /continue/i }).click();
    await page.waitForTimeout(2000);

    if (page.url().includes("/client-trust")) {
      console.log("On client-trust, forcing navigation");
      await page.evaluate(() => {
        window.location.href = "/presentation";
      });
    }

    await page.waitForURL((url) => url.href.includes("/presentation"), { timeout: 30000 });
    await page.waitForTimeout(2000);
    await context.storageState({ path: authFile });
  } catch (uiError) {
    console.error("UI auth failed:", uiError);
    throw uiError;
  }

  await browser.close();
}

export default globalSetup;
