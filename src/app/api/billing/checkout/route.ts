import { NextResponse } from "next/server";

import { env } from "@/env";
import { auth } from "@/server/auth";

/**
 * POST /api/billing/checkout
 *
 * SCAFFOLD ONLY. Implementation contract:
 *
 * Request body: { priceId: string; plan?: "plus" | "pro" | "ultra" }
 *   - priceId should be one of the Stripe Price IDs for the Plus/Pro/Ultra
 *     tiers defined in src/components/presentation/controls/SubscriptionModal.tsx.
 *     Add those to src/env.js as STRIPE_PRICE_PLUS / STRIPE_PRICE_PRO /
 *     STRIPE_PRICE_ULTRA (or read from a config object) before implementing.
 *
 * Response: { url: string } — the Stripe-hosted Checkout Session URL to
 *   redirect the user to. On failure, return a JSON error with the
 *   appropriate status code.
 *
 * Steps to implement:
 *   1. Install the Stripe SDK: `pnpm add stripe` and instantiate
 *      `new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: "2024-12-18.acacia" })`.
 *   2. Map the `plan` (or priceId) to a Stripe Price ID.
 *   3. Create or look up the Stripe Customer for `session.user.id`
 *      (consider adding a `stripe_customer_id` column to public.users —
 *      or store it on the subscriptions row from migration 016).
 *   4. Call `stripe.checkout.sessions.create` with mode: "subscription",
 *      line_items: [{ price, quantity: 1 }], success_url, cancel_url,
 *      customer, client_reference_id: session.user.id, and
 *      metadata: { userId: session.user.id }.
 *   5. Return `{ url: session.url }`.
 *
 * This route is gated by the Clerk session above; the proxy's public
 * route matcher should be updated to include `/api/billing/checkout` if
 * you want it callable from the landing page before sign-in. Currently
 * the modal lives behind the editor (auth required).
 */
export async function POST(_request: Request) {
  if (!env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { error: "Stripe is not configured. Set STRIPE_SECRET_KEY to enable checkout." },
      { status: 501 },
    );
  }

  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // TODO: implement checkout session creation. See the JSDoc above.
  return NextResponse.json(
    { error: "Checkout not yet implemented. See the JSDoc on this route." },
    { status: 501 },
  );
}
