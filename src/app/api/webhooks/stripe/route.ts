import { NextResponse } from "next/server";

import { env } from "@/env";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * POST /api/webhooks/stripe
 *
 * SCAFFOLD ONLY. Implementation contract:
 *
 * Stripe sends events here. You must verify the signature with
 * `STRIPE_WEBHOOK_SECRET` and upsert into public.subscriptions
 * (migration 016), then update Clerk `publicMetadata.hasAccess` to
 * gate the premium features in
 * src/components/presentation/controls/global-settings/sections/PremiumFeaturesSection.tsx.
 *
 * Events to handle:
 *   - checkout.session.completed
 *       Resolve the user from `client_reference_id` (set in the
 *       checkout route) and store the subscription id + customer id
 *       + price id + status in public.subscriptions.
 *   - customer.subscription.created / .updated
 *       Upsert public.subscriptions by Stripe subscription id. Map
 *       Stripe `status` -> Clerk `publicMetadata.hasAccess`:
 *         active | trialing -> hasAccess = true
 *         everything else   -> hasAccess = false
 *       Use the Clerk SDK (`clerkClient.users.updateUserMetadata`) to
 *       set the metadata. The user id is on the subscription row.
 *   - customer.subscription.deleted
 *       Mark the subscription canceled and set hasAccess = false.
 *
 * Steps to implement:
 *   1. Install the Stripe SDK: `pnpm add stripe`.
 *   2. Read the raw request body (`await request.text()`) — required
 *      for signature verification.
 *   3. Call `stripe.webhooks.constructEvent(body, sig, env.STRIPE_WEBHOOK_SECRET)`.
 *   4. Switch on `event.type` and dispatch.
 *   5. Add `/api/webhooks/stripe` to the public route matcher in
 *      src/proxy.ts and the rate-limit config.
 *   6. In the Clerk dashboard, create a webhook endpoint pointing to
 *      this URL and copy its signing secret into STRIPE_WEBHOOK_SECRET.
 *
 * This route must run on the Node.js runtime (set above) because the
 * Stripe SDK uses Node crypto.
 */
export async function POST(request: Request) {
  if (!env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET is not configured" },
      { status: 500 },
    );
  }

  const supabase = await createClient();
  if (!supabase) {
    console.warn("Supabase not configured; skipping Stripe webhook");
    // Return 200 so Stripe does not retry forever during local dev.
    return NextResponse.json({ received: true });
  }

  const sig = request.headers.get("stripe-signature") ?? "";

  // TODO: implement signature verification, event dispatch, and the
  // public.subscriptions + Clerk publicMetadata.hasAccess writes.
  // See the JSDoc above for the full contract.
  void supabase;
  void sig;

  return NextResponse.json(
    { error: "Stripe webhook not yet implemented. See the JSDoc on this route." },
    { status: 501 },
  );
}
