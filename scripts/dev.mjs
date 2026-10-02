// Dev server orchestrator: starts `next dev` on an explicit port, prewarms the
// main routes once the server is ready, and forwards signals so Ctrl-C cleanly
// stops Next. Prewarming moves Turbopack's cold compile to startup, so the first
// browser visit to any main route is already warm (seconds instead of 15-40s).
//
// The port is pinned rather than left to `next dev`, which otherwise falls back
// to 3001 (and keeps incrementing) whenever 3000 is already taken. Next only
// retries ports when *neither* `--port` nor `PORT` was given
// (node_modules/next/dist/cli/next-dev.js: `allowRetry = portSource === 'default'`),
// so passing --port turns a silent port drift into a loud "port is in use"
// failure. E2E depends on this: playwright.config.ts and this script must agree
// on one port.
//
// Port resolution order: `--port/-p` in the script arguments, then `PORT`, then
// 3000. Prewarming follows the same port, and the actually-bound port is read
// back from Next's startup output and printed, so a mismatch is never invisible.

import { spawn } from "node:child_process";

const DEFAULT_PORT = "3000";

const argv = process.argv.slice(2);

function resolvePort(args) {
  const flagIndex = args.findIndex((arg) => arg === "-p" || arg === "--port");
  if (flagIndex !== -1 && args[flagIndex + 1]) return args[flagIndex + 1];
  const inline = args.find((arg) => arg.startsWith("--port=") || /^-p\d+$/.test(arg));
  if (inline) return inline.replace(/^(--port=|-p)/, "");
  return process.env.PORT || DEFAULT_PORT;
}

const PORT = resolvePort(argv);
const hasPortFlag = argv.some(
  (arg) => arg === "-p" || arg === "--port" || arg.startsWith("--port=") || /^-p\d+$/.test(arg),
);
const nextArgs = hasPortFlag ? argv : [...argv, "--port", PORT];

const BASE = process.env.PREWARM_BASE || `http://localhost:${PORT}`;

const ROUTES = [
  "/",
];

console.log(`[dev] starting next dev on port ${PORT} (override with PORT=<n> or --port <n>)`);

const next = spawn("pnpm", ["next", "dev", ...nextArgs], {
  // stdout is piped so the bound port can be read from Next's banner; every
  // chunk is forwarded verbatim so the developer's terminal is unaffected.
  stdio: ["inherit", "pipe", "inherit"],
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

let announcedPort = false;
let stdoutRemainder = "";

function announceBoundPort(chunk) {
  stdoutRemainder += chunk;
  const lines = stdoutRemainder.split(/\r?\n/);
  stdoutRemainder = lines.pop() ?? "";
  for (const line of lines) {
    if (announcedPort) continue;
    const match = /^\s*-\s*Local:\s*(\S+)/.exec(line);
    if (!match) continue;
    announcedPort = true;
    const url = match[1].replace(/\/$/, "");
    const boundPort = new URL(url).port || "80";
    if (boundPort === PORT) {
      console.log(`[dev] next dev bound to ${url}`);
    } else {
      console.log(`[dev] next dev bound to ${url} (requested ${PORT})`);
      console.log(
        `[dev] WARNING: anything pointed at http://localhost:${PORT} ` +
          `(Playwright baseURL, prewarm, curl) will hit the wrong server.`,
      );
    }
  }
}

next.stdout.on("data", (chunk) => {
  process.stdout.write(chunk);
  announceBoundPort(chunk.toString());
});

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
    console.log(`[dev] server on ${BASE} not ready in time; skipping prewarm`);
    return;
  }
  console.log(`[dev] server ready on ${BASE}, prewarming routes...`);
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