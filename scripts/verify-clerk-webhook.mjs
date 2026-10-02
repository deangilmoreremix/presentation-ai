#!/usr/bin/env node
/**
 * Verifies POST /api/webhooks/clerk against a running dev server using
 * correctly Svix-signed payloads, plus an invalid-signature negative case.
 *
 * Usage:
 *   CLERK_WEBHOOK_SECRET=<test secret> \
 *   BASE_URL=http://localhost:3111 \
 *   node scripts/verify-clerk-webhook.mjs
 *
 * Every row created here is deleted before the script exits.
 */

import { createHmac, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

import { createClient } from "@supabase/supabase-js";

const ROOT = process.cwd();
const TEST_SECRET = process.env.CLERK_WEBHOOK_SECRET;
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3111";
const ENDPOINT = `${BASE_URL}/api/webhooks/clerk`;
const PREFIX = `user_webhookverify_${process.pid}_${randomUUID().slice(0, 8)}`;

if (!TEST_SECRET) {
  console.error("CLERK_WEBHOOK_SECRET must be set to the secret the server uses");
  process.exit(2);
}

loadDotEnv(path.join(ROOT, ".env"));

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } },
);

function loadDotEnv(file) {
  let text;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    return;
  }
  for (const line of text.split("\n")) {
    const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
    if (!match) continue;
    const value = match[2].replace(/^["']|["']$/g, "");
    process.env[match[1]] ??= value;
  }
}

/** Builds the Svix v1 signature header for a raw body. */
function signSvix(secret, payload, { id, timestamp, corrupt = false }) {
  const withoutPrefix = secret.replace(/^whsec_/, "");
  const key = Buffer.from(withoutPrefix, "base64");
  const signedContent = `${id}.${timestamp}.${payload}`;
  const signature = createHmac("sha256", key)
    .update(signedContent)
    .digest("base64");
  return `v1,${corrupt ? Buffer.from("bogus").toString("base64") : signature}`;
}

function buildHeaders(payload, secret, options = {}) {
  const id = options.id ?? `msg_${randomUUID()}`;
  const timestamp = options.timestamp ?? Math.floor(Date.now() / 1000);
  return {
    "content-type": "application/json",
    "svix-id": id,
    "svix-timestamp": String(timestamp),
    "svix-signature": signSvix(secret, payload, {
      id,
      timestamp,
      corrupt: options.corrupt,
    }),
  };
}

async function post(payload, { secret = TEST_SECRET, ...options } = {}) {
  const response = await fetchWithRetry(ENDPOINT, {
    method: "POST",
    headers: buildHeaders(payload, secret, options),
    body: payload,
  });
  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  return { status: response.status, body };
}

/** src/proxy.ts rate limits this route to 20 requests per minute. */
async function fetchWithRetry(url, init) {
  for (let attempt = 0; ; attempt += 1) {
    const response = await fetch(url, init);
    if (response.status !== 429 || attempt >= 3) return response;
    const waitSeconds = Number(/in (\d+) seconds/.exec(await response.text())?.[1] ?? 10);
    console.log(`  (rate limited; retrying in ${waitSeconds}s)`);
    await new Promise((resolve) => setTimeout(resolve, (waitSeconds + 1) * 1000));
  }
}

async function readRow(clerkId) {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("clerk_id", clerkId);
  if (error) throw error;
  return data ?? [];
}

function userEvent(type, clerkId, { first, last, email, image } = {}) {
  return JSON.stringify({
    type,
    data: {
      id: clerkId,
      object: "user",
      first_name: first ?? null,
      last_name: last ?? null,
      image_url: image ?? null,
      email_addresses: email ? [{ id: `idn_${clerkId}`, email_address: email }] : [],
      public_metadata: {},
    },
  });
}

const results = [];
function assert(name, condition, detail = "") {
  results.push({ name, ok: Boolean(condition), detail });
  console.log(`${condition ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function main() {
  const created = `${PREFIX}_created`;
  const orphan = `${PREFIX}_orphan`;

  // 1. valid user.created
  const createdEmail = `${PREFIX}@example.test`;
  const createdImage = `https://img.clerk.test/${PREFIX}.png`;
  let res = await post(
    userEvent("user.created", created, {
      first: "Ada",
      last: "Lovelace",
      email: createdEmail,
      image: createdImage,
    }),
  );
  assert("user.created returns 200 {received:true}", res.status === 200 && res.body?.received === true, `status=${res.status} body=${JSON.stringify(res.body)}`);

  let rows = await readRow(created);
  assert("user.created inserts exactly 1 row", rows.length === 1, `rows=${rows.length}`);
  assert(
    "row has correct clerk_id/email/name/image",
    rows.length === 1 &&
      rows[0].clerk_id === created &&
      rows[0].email === createdEmail &&
      rows[0].name === "Ada Lovelace" &&
      rows[0].image === createdImage,
    rows.length ? JSON.stringify({ clerk_id: rows[0].clerk_id, email: rows[0].email, name: rows[0].name, image: rows[0].image }) : "no row",
  );

  // 2. valid user.updated -> onConflict clerk_id upsert
  const updatedEmail = `${PREFIX}-updated@example.test`;
  const updatedImage = `https://img.clerk.test/${PREFIX}-updated.png`;
  res = await post(
    userEvent("user.updated", created, {
      first: "Grace",
      last: "Hopper",
      email: updatedEmail,
      image: updatedImage,
    }),
  );
  assert("user.updated returns 200 {received:true}", res.status === 200 && res.body?.received === true, `status=${res.status} body=${JSON.stringify(res.body)}`);

  rows = await readRow(created);
  assert("user.updated updates in place (no duplicate row)", rows.length === 1, `rows=${rows.length}`);
  assert(
    "user.updated row reflects new email/name/image",
    rows.length === 1 &&
      rows[0].email === updatedEmail &&
      rows[0].name === "Grace Hopper" &&
      rows[0].image === updatedImage,
    rows.length ? JSON.stringify({ email: rows[0].email, name: rows[0].name, image: rows[0].image }) : "no row",
  );

  // 3. invalid signature -> 400, nothing written
  res = await post(
    userEvent("user.created", orphan, { first: "Mallory", email: `${PREFIX}-bad@example.test` }),
    { secret: `${TEST_SECRET.slice(0, -4)}ZZZZ` },
  );
  assert("invalid signature returns 400", res.status === 400, `status=${res.status} body=${JSON.stringify(res.body)}`);
  assert("invalid signature wrote no row", (await readRow(orphan)).length === 0, "expected 0 rows");

  // 3b. missing signature headers -> 400
  const badNoSig = await fetchWithRetry(ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: userEvent("user.created", `${PREFIX}_nosig`, {}),
  });
  assert("missing signature headers return 400", badNoSig.status === 400, `status=${badNoSig.status}`);

  // 3c. tampered body -> 400 (signature covers the body)
  const tamperedId = `${PREFIX}_tampered`;
  const signedPayload = userEvent("user.created", tamperedId, { first: "Eve", email: `${PREFIX}-eve@example.test` });
  const res3 = await post(signedPayload);
  const res3Tampered = await fetchWithRetry(ENDPOINT, {
    method: "POST",
    headers: buildHeaders(signedPayload, TEST_SECRET, {}),
    body: userEvent("user.created", tamperedId, { first: "Mallory", email: `${PREFIX}-mallory@example.test` }),
  });
  assert("signed body accepted", res3.status === 200, `status=${res3.status}`);
  assert("body tampered after signing returns 400", res3Tampered.status === 400, `status=${res3Tampered.status}`);

  // 4. user.deleted removes the row
  res = await post(userEvent("user.deleted", created, {}));
  assert("user.deleted returns 200 {received:true}", res.status === 200 && res.body?.received === true, `status=${res.status} body=${JSON.stringify(res.body)}`);
  assert("user.deleted removed the row", (await readRow(created)).length === 0, "expected 0 rows");

  // 6. a database failure must not be reported as success.
  // A signed user.created with no data.id violates users.clerk_id NOT NULL.
  res = await post(
    JSON.stringify({
      type: "user.created",
      data: { object: "user", email_addresses: [], public_metadata: {} },
    }),
  );
  assert(
    "database error is surfaced as 500, not a silent 200",
    res.status === 500,
    `status=${res.status} body=${JSON.stringify(res.body)}`,
  );

  // 5. unknown event type is accepted and ignored
  res = await post(userEvent("session.created", `${PREFIX}_session`, {}));
  assert("unknown event type returns 200 and is ignored", res.status === 200 && (await readRow(`${PREFIX}_session`)).length === 0, `status=${res.status}`);
}

async function cleanup() {
  const ids = [created_(), orphan_(), tampered_(), nosig_()].filter(Boolean);
  if (ids.length === 0) return;
  await supabase.from("users").delete().in("clerk_id", ids);
}

const created_ = () => `${PREFIX}_created`;
const orphan_ = () => `${PREFIX}_orphan`;
const tampered_ = () => `${PREFIX}_tampered`;
const nosig_ = () => `${PREFIX}_nosig`;

try {
  await main();
} catch (error) {
  assert("script ran without unexpected errors", false, String(error));
} finally {
  await cleanup();
  const { data: leftovers } = await supabase.from("users").select("clerk_id").like("clerk_id", `${PREFIX}%`);
  assert("cleanup removed every test row", (leftovers ?? []).length === 0, JSON.stringify(leftovers ?? []));
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} assertions passed`);
process.exit(failed.length === 0 ? 0 : 1);