// Prewarms the main app routes so the first browser visit hits a warm
// Turbopack cache instead of waiting 15-40s for a cold compile.
// Runs after `next dev` reports ready and stays out of the request path.

const BASE = process.env.PREWARM_BASE || "http://localhost:3000";

const ROUTES = [
  "/",
  "/presentation",
  "/presentation/create",
  "/image-studio",
  "/settings",
];

async function waitForServer(timeoutMs = 120000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(BASE + "/", { method: "HEAD" });
      if (res.ok || res.status === 200) return true;
    } catch {
      // server not up yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

async function warm() {
  const up = await waitForServer();
  if (!up) {
    console.log("[prewarm] server did not become ready in time, skipping");
    return;
  }
  console.log("[prewarm] server ready, warming routes...");
  for (const route of ROUTES) {
    const start = Date.now();
    try {
      await fetch(BASE + route, { method: "GET" });
      console.log(`[prewarm] ${route} (${Date.now() - start}ms)`);
    } catch (err) {
      console.log(`[prewarm] ${route} failed: ${err}`);
    }
  }
  console.log("[prewarm] done");
}

warm();
