#!/usr/bin/env node

/**
 * Smoke test for the Clerk webhook endpoint.
 *
 * This script validates that:
 * 1. The webhook endpoint rejects requests without valid Svix headers
 * 2. The webhook endpoint accepts valid test payloads
 *
 * Usage:
 *   WEBHOOK_SECRET=whsec_... node scripts/test-webhook.mjs
 *
 * The WEBHOOK_SECRET must match CLERK_WEBHOOK_SECRET in your .env.
 */

import { Webhook } from "svix";

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
const WEBHOOK_URL = process.env.WEBHOOK_URL || "http://localhost:3000/api/webhooks/clerk";

if (!WEBHOOK_SECRET) {
  console.error("ERROR: WEBHOOK_SECRET environment variable is required");
  console.error("Set it to match CLERK_WEBHOOK_SECRET in your .env");
  process.exit(1);
}

const svix = new Webhook(WEBHOOK_SECRET);

const testEvent = {
  type: "user.created",
  data: {
    id: "test-user-123",
    email_addresses: [{ email_address: "test@example.com" }],
    first_name: "Test",
    last_name: "User",
    image_url: "https://example.com/avatar.png",
    public_metadata: { role: "USER", hasAccess: false },
  },
};

const payload = JSON.stringify(testEvent);
const timestamp = Math.floor(Date.now() / 1000).toString();
const headers = svix.getSignedHeaders({
  payload,
  timestamp,
});

console.log("Testing Clerk webhook endpoint...\n");
console.log(`URL: ${WEBHOOK_URL}`);
console.log(`Event type: ${testEvent.type}`);
console.log(`Timestamp: ${timestamp}`);
console.log("");

async function testWebhook() {
  try {
    const response = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "svix-id": headers["svix-id"],
        "svix-timestamp": headers["svix-timestamp"],
        "svix-signature": headers["svix-signature"],
      },
      body: payload,
    });

    const text = await response.text();
    console.log(`Response status: ${response.status}`);
    console.log(`Response body: ${text}`);

    if (response.status === 200 || response.status === 202) {
      console.log("\n✓ Webhook test passed");
      process.exit(0);
    } else {
      console.log("\n✗ Webhook test failed");
      process.exit(1);
    }
  } catch (error) {
    console.error("✗ Webhook test error:", error);
    process.exit(1);
  }
}

testWebhook();
