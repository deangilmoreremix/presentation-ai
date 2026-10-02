#!/usr/bin/env node

/**
 * Pre-flight check for local development, CI and first-time setup.
 *
 * Usage:
 *   pnpm doctor
 *
 * Why this exists: `.env` and `node_modules/` are git-ignored, so a worktree
 * reset silently deletes them. The first symptom is a raw t3-env dump from
 * `pnpm build` / `pnpm dev` ("Invalid environment variables: ...") with no hint
 * about what is missing or where to get it. This script answers that question
 * up front.
 *
 * SECURITY: this script NEVER prints an environment variable value, not even a
 * prefix or a length. It reports PRESENT / MISSING per variable name only, and
 * on error it prints names and sources, never data.
 *
 * Dependency-free by design (node builtins only) so it can run before
 * `pnpm install` has ever been run.
 *
 * Exit code: 0 when nothing is blocking, 1 otherwise.
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ENV_FILE = join(ROOT, ".env");
const ENV_EXAMPLE_FILE = join(ROOT, ".env.example");
const NODE_MODULES_DIR = join(ROOT, "node_modules");
const PACKAGE_JSON = join(ROOT, "package.json");

// Next.js 16 refuses to start below this. Keep in sync with
// `engines` in package.json if that is ever added.
const MIN_NODE = { major: 20, minor: 9 };

/**
 * Variables declared as required in `src/env.js` (no `.optional()`, no default).
 * `pnpm build` and `pnpm dev` both hard-fail while any of these is absent.
 */
const REQUIRED_VARS = [
  {
    name: "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
    where: "Clerk Dashboard -> API Keys -> Publishable key (starts with pk_)",
    breaks: "`<ClerkProvider>` in the root layout cannot mount; every route fails.",
  },
  {
    name: "CLERK_SECRET_KEY",
    where: "Clerk Dashboard -> API Keys -> Secret key (starts with sk_)",
    breaks: "`src/proxy.ts` runs clerkMiddleware on every route; auth() throws.",
  },
  {
    name: "DATABASE_URL",
    where:
      "Supabase Dashboard -> Project Settings -> Database -> Connection string " +
      "(session mode). Must be the Supabase project host (db.<ref>.supabase.co " +
      "or the *.pooler.supabase.com session pooler) — never a local Postgres " +
      "container, because supabase/migrations reference auth.users, auth.uid(), " +
      "storage.buckets and storage.foldername(), which plain Postgres lacks.",
    breaks:
      "The LangGraph Postgres checkpointer connects at module load, and " +
      "`pnpm db:push` has nothing to apply to.",
  },
];

/**
 * Variables declared in `src/env.js` with `.optional()` or a `.default()`.
 * They never block start-up, but each one gates a feature; the note says what.
 */
const OPTIONAL_VARS = [
  {
    name: "CLERK_WEBHOOK_SECRET",
    where:
      "Clerk Dashboard -> Webhooks -> Add Endpoint -> URL " +
      "<your-origin>/api/webhooks/clerk -> subscribe to user.created, " +
      "user.updated, user.deleted. The `whsec_...` value is shown only in the " +
      "Dashboard once the endpoint is created; there is no Backend API endpoint " +
      "that mints it.",
    breaks:
      "/api/webhooks/clerk returns 500 and Clerk users are never synced into " +
      "Supabase `public.users`.",
  },
  {
    name: "OPENAI_API_KEY",
    where: "https://platform.openai.com/api-keys",
    breaks: "Every AI generation endpoint returns 400 (outlines, slides, images).",
  },
  {
    name: "UPLOADTHING_TOKEN",
    where: "https://app.uploadthing.com -> API Keys",
    breaks: "Browser uploads to /api/uploadthing fail signature verification.",
  },
  {
    name: "API_KEY_ENCRYPTION_MASTER_KEY",
    where:
      'Generate: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))" ' +
      "(must decode to exactly 32 bytes; 64-char hex is also accepted)",
    breaks: "Per-user OpenAI keys cannot be stored server-side (encrypted at rest).",
  },
  { name: "NEXT_PUBLIC_SUPABASE_URL", where: "Supabase Dashboard -> Project Settings -> API -> Project URL", breaks: "Browser-side Supabase client is unconfigured." },
  { name: "NEXT_PUBLIC_SUPABASE_ANON_KEY", where: "Supabase Dashboard -> Project Settings -> API -> anon / publishable key", breaks: "Browser-side Supabase auth and RLS-scoped reads fail." },
  { name: "SUPABASE_SERVICE_ROLE_KEY", where: "Supabase Dashboard -> Project Settings -> API -> service_role key", breaks: "Server-side admin writes bypass anon RLS; webhook provisioning degrades." },
  { name: "TOGETHER_AI_API_KEY", where: "https://api.together.ai/settings/api-keys", breaks: "OpenAI-compatible Together models are unavailable." },
  { name: "PINECONE_API_KEY", where: "https://app.pinecone.io -> API Keys", breaks: "Vector retrieval is unavailable." },
  { name: "TAVILY_API_KEY", where: "https://app.tavily.com/home", breaks: "Web-search enrichment during generation is unavailable." },
  { name: "UNSPLASH_ACCESS_KEY", where: "https://unsplash.com/developers", breaks: "Unsplash image search returns nothing." },
  { name: "PIXABAY_API_KEY", where: "https://pixabay.com/api/docs/", breaks: "Pixabay image search returns nothing." },
  { name: "GIPHY_API_KEY", where: "https://developers.giphy.com", breaks: "GIF search returns nothing." },
  { name: "PEXELS_API_KEY", where: "https://www.pexels.com/api/", breaks: "Pexels image search returns nothing." },
  { name: "GOOGLE_CUSTOM_SEARCH_API_KEY", where: "https://console.cloud.google.com -> APIs & Services -> Credentials", breaks: "Google Custom Search is unavailable." },
  { name: "SEARCH_ENGINE_CX", where: "Google Programmable Search Engine -> search element ID", breaks: "Google Custom Search cannot resolve a target." },
  { name: "SENTRY_DSN", where: "Sentry -> Project -> Settings -> Client Keys (DSN)", breaks: "Server errors are not reported to Sentry." },
  { name: "NEXT_PUBLIC_SENTRY_DSN", where: "Sentry -> Project -> Settings -> Client Keys (DSN)", breaks: "Client errors are not reported to Sentry." },
  { name: "NODE_ENV", where: 'Leave unset or set to "development" / "test" / "production" (defaults to "development")', breaks: "Nothing; t3-env defaults it to \"development\"." },
];

/**
 * Read by `src/env.js` directly (skipValidation) rather than declared in the
 * schema, so it is reported separately.
 */
const UNSCHEMA_VARS = [
  {
    name: "SKIP_ENV_VALIDATION",
    where: 'Only ever "true"/"1" locally, to build in an environment with no secrets. Never set it in production.',
    breaks: 'If it is "true", every schema check is skipped and the raw t3-env error you would rely on never appears.',
  },
];

const ok = (msg) => console.log(`  [doctor] ✓ ${msg}`);
const bad = (msg) => console.log(`  [doctor] ✗ ${msg}`);
const warn = (msg) => console.log(`  [doctor] ! ${msg}`);

const problems = [];

/**
 * Minimal .env parser. Handles `export ` prefixes, `#` comments, single/double
 * quotes and inline comments. Returns an empty string for `KEY=` so that empty
 * values count as missing (matches t3-env `emptyStringAsUndefined: true`).
 */
function parseEnvFile(contents) {
  const parsed = {};
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const body = line.startsWith("export ") ? line.slice(7).trim() : line;
    const eq = body.indexOf("=");
    if (eq === -1) continue;
    const key = body.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    const rawValue = body.slice(eq + 1).trim();
    if (rawValue.startsWith('"') || rawValue.startsWith("'")) {
      const quote = rawValue[0];
      const end = rawValue.indexOf(quote, 1);
      parsed[key] = end === -1 ? rawValue.slice(1) : rawValue.slice(1, end);
    } else {
      const inlineComment = rawValue.search(/\s+#/);
      parsed[key] = (inlineComment === -1 ? rawValue : rawValue.slice(0, inlineComment)).trim();
    }
  }
  return parsed;
}

/** Real process env wins over the file, so CI-injected secrets still count. */
function collectValues() {
  const values = new Map();
  let fileValues = {};
  if (existsSync(ENV_FILE)) {
    try {
      fileValues = parseEnvFile(readFileSync(ENV_FILE, "utf-8"));
    } catch (error) {
      console.log(`  [doctor] ! could not read .env: ${error instanceof Error ? error.message : "unknown error"}`);
    }
  }
  for (const [key, value] of Object.entries(fileValues)) {
    if (typeof value === "string" && value !== "") values.set(key, value);
  }
  for (const [key, value] of Object.entries(process.env)) {
    if (typeof value === "string" && value !== "") values.set(key, value);
  }
  return values;
}

/** Mirrors the masterKeySchema in src/env.js so the two never disagree. */
function isValidMasterKey(value) {
  if (/^[0-9a-fA-F]{64}$/.test(value)) return true;
  try {
    return Buffer.from(value, "base64").length === 32;
  } catch {
    return false;
  }
}

function checkEnvFile(values) {
  console.log("\n.env file");
  if (!existsSync(ENV_FILE)) {
    bad(".env is missing (it is git-ignored, so a worktree reset deletes it).");
    if (existsSync(ENV_EXAMPLE_FILE)) {
      console.log("        Restore a template and fill it in:  cp .env.example .env");
    }
    console.log("        Then set every REQUIRED variable below:");
    for (const variable of REQUIRED_VARS) {
      console.log(`          ${variable.name}`);
      console.log(`            get it from: ${variable.where}`);
    }
    problems.push(".env is missing");
  } else {
    ok(`.env is present (${statSync(ENV_FILE).size} bytes)`);
  }

  const present = (name) => values.has(name);
  const missingRequired = REQUIRED_VARS.filter((variable) => !present(variable.name));
  const missingOptional = OPTIONAL_VARS.filter((variable) => !present(variable.name));

  console.log("\nRequired variables");
  for (const variable of REQUIRED_VARS) {
    if (present(variable.name)) {
      ok(`${variable.name} — PRESENT`);
    } else {
      bad(`${variable.name} — MISSING`);
      console.log(`          get it from: ${variable.where}`);
      problems.push(`${variable.name} is missing`);
    }
  }

  console.log("\nOptional variables (MISSING only disables the feature, never start-up)");
  if (missingOptional.length === 0) {
    ok("every optional variable is set");
  } else {
    for (const variable of missingOptional) {
      console.log(`  [doctor] - ${variable.name} — MISSING (${variable.breaks})`);
      console.log(`          get it from: ${variable.where}`);
    }
  }

  const masterKey = values.get("API_KEY_ENCRYPTION_MASTER_KEY");
  if (masterKey && !isValidMasterKey(masterKey)) {
    bad("API_KEY_ENCRYPTION_MASTER_KEY is set but does not decode to 32 bytes.");
    console.log('          generate one: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"');
    problems.push("API_KEY_ENCRYPTION_MASTER_KEY has an invalid format");
  }

  console.log("\nRead outside the schema");
  for (const variable of UNSCHEMA_VARS) {
    const raw = values.get(variable.name);
    if (raw && /^(1|true)$/i.test(raw)) {
      warn(`${variable.name} is set — src/env.js will skip ALL validation with it.`);
      problems.push(`${variable.name} disables env validation`);
    } else if (raw) {
      ok(`${variable.name} is set to a non-skipping value (validation stays on)`);
    } else {
      console.log(`  [doctor] - ${variable.name} — MISSING (validation stays on; this is the safe default)`);
    }
  }
}

function checkDependencies() {
  console.log("\nDependencies");
  if (!existsSync(NODE_MODULES_DIR) || !statSync(NODE_MODULES_DIR).isDirectory()) {
    bad("node_modules/ is missing (it is git-ignored, so a worktree reset deletes it).");
    console.log("        Run exactly:  pnpm install");
    problems.push("node_modules is missing");
    return;
  }
  ok("node_modules/ is present");
}

function checkNode() {
  console.log("\nRuntime");
  const [major, minor] = process.versions.node.split(".").map((part) => Number.parseInt(part, 10));
  const version = `${major}.${minor}.${process.versions.node.split(".")[2]}`;
  if (major > MIN_NODE.major || (major === MIN_NODE.major && minor >= MIN_NODE.minor)) {
    ok(`Node v${version} satisfies the Next.js 16 requirement (>=${MIN_NODE.major}.${MIN_NODE.minor})`);
  } else {
    bad(`Node v${version} is below the Next.js 16 requirement (>=${MIN_NODE.major}.${MIN_NODE.minor}).`);
    console.log("        Upgrade Node (or run it via nvm/volta) and retry.");
    problems.push(`Node ${version} is too old`);
  }
}

function detectPnpmVersion() {
  const userAgent = process.env.npm_config_user_agent;
  if (userAgent) {
    const match = /(?:^|\s)pnpm\/(\S+)/.exec(userAgent);
    if (match) return match[1];
  }
  try {
    return execFileSync("pnpm", ["--version"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      shell: false,
    }).trim();
  } catch {
    return null;
  }
}

function checkPnpm() {
  console.log("\nPackage manager");
  let pinned = null;
  try {
    pinned = JSON.parse(readFileSync(PACKAGE_JSON, "utf-8")).packageManager ?? null;
  } catch {
    warn("could not read package.json, skipping the packageManager check");
    return;
  }
  if (!pinned) {
    warn("package.json has no packageManager field; nothing to compare against");
    return;
  }
  const expected = pinned.replace(/^pnpm@/, "");
  const actual = detectPnpmVersion();
  if (!actual) {
    warn(`could not detect the running pnpm version (packageManager pins ${pinned})`);
    return;
  }
  if (actual === expected) {
    ok(`pnpm ${actual} matches the packageManager pin (${pinned})`);
  } else {
    bad(`pnpm ${actual} does not match the packageManager pin (${pinned}).`);
    console.log(`        Match it exactly:  corepack enable && corepack prepare pnpm@${expected} --activate`);
    problems.push(`pnpm ${actual} does not match ${pinned}`);
  }
}

function main() {
  console.log("[doctor] environment pre-flight — values are never printed, only PRESENT/MISSING.");
  const values = collectValues();
  checkEnvFile(values);
  checkDependencies();
  checkNode();
  checkPnpm();

  console.log("");
  if (problems.length === 0) {
    ok("all checks passed. `pnpm dev` should start.");
    return;
  }
  bad(`${problems.length} problem(s) found:`);
  for (const problem of problems) console.log(`        - ${problem}`);
  process.exitCode = 1;
}

main();