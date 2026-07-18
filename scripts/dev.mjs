// Dev server orchestrator: starts `next dev`, prewarms the main routes once
// the server is ready, and forwards signals so Ctrl-C cleanly stops Next.
// Prewarming moves Turbopack's cold compile to startup, so the first browser
// visit to any main route is already warm (seconds instead of 15-40s).

import { spawn } from "node:child_process";

const BASE = process.env.PREWARM_BASE || "http://localhost:3000";

const ROUTES = [
  "/",
  "/presentation",
  "/presentation/create",
  "/image-studio",
  "/settings",
];

const next = spawn("pnpm", ["next", "dev", ...process.argv.slice(2)], {
  stdio: "inherit",
  env: process.env,
  shell: false,
});

function shutdown(code) {
  next.kill("SIGTERM");
  process.exit(code ?? 0);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
next.on("exit", (code) => process.exit(code ?? 0));

async function waitForServer(timeoutMs = 180000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(BASE + "/", { method: "HEAD" });
      if (res.ok) return true;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

(async () => {
  const up = await waitForServer();
  if (!up) {
    console.log("[dev] server not ready in time; skipping prewarm");
    return;
  }
  console.log("[dev] server ready, prewarming routes...");
  for (const route of ROUTES) {
    const t = Date.now();
    try {
      await fetch(BASE + route, { method: "GET" });
      console.log(`[dev] prewarmed ${route} (${Date.now() - t}ms)`);
    } catch (err) {
      console.log(`[dev] prewarm ${route} failed: ${err}`);
    }
  }
  console.log("[dev] prewarm complete — routes are warm");
})();
