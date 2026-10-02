import { defineConfig, devices } from "@playwright/test";

// One port for the whole E2E run. `next dev` with no --port silently falls back
// to 3001 (and keeps incrementing) when 3000 is taken, which left the suite
// probing a port that was not serving this app. Read PORT so the port can be
// moved when 3000 is occupied, and pass it explicitly to the webServer below so
// Next fails loudly instead of drifting.
const PORT = process.env.PORT ?? "3000";
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL,
    trace: "on-first-retry",
    browserName: "chromium",
    storageState: "./tests/.auth/user.json",
  },

  globalSetup: "./tests/global-setup.ts",

  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
    {
      name: "firefox",
      use: { browserName: "firefox" },
    },
    {
      name: "webkit",
      use: { browserName: "webkit" },
    },
    {
      name: "Mobile Chrome",
      use: { ...devices["Pixel 5"] },
    },
    {
      name: "Mobile Safari",
      use: { ...devices["iPhone 12"] },
    },
  ],

  webServer: {
    command: `pnpm dev --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 300000,
  },
});
