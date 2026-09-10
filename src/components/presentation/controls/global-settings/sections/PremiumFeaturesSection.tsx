"use client";

import { useState } from "react";

import { useAuth } from "@/components/AppAuthProvider";
import { Label } from "@/components/ui/label";
import { SubscriptionModal } from "../../SubscriptionModal";

/**
 * Premium feature toggles (animations, branding removal).
 *
 * Gating model (scaffold):
 *   - The premium features themselves (enabling animations, removing
 *     "Smart Presentations" branding from exports) are NOT yet wired
 *     in the rest of the editor — this section is the UI surface for
 *     the paywall.
 *   - `hasAccess` is read from Clerk `publicMetadata.hasAccess` via
 *     `useAuth()`. When false, clicking a toggle opens the
 *     `SubscriptionModal`. When true, the toggle is visually "on" and
 *     non-interactive until the underlying features are implemented.
 *   - The actual entitlement is set by the Stripe webhook
 *     (src/app/api/webhooks/stripe/route.ts, see migration 016 and
 *     the route's JSDoc for the contract), which writes
 *     `publicMetadata.hasAccess` on the Clerk user.
 */
export function PremiumFeaturesSection() {
  const { hasAccess } = useAuth();
  const [subscriptionModalOpen, setSubscriptionModalOpen] = useState(false);

  const handlePremiumFeatureClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (hasAccess) {
      // Entitlement present but the underlying features aren't wired
      // yet. No-op until the animations / branding-removal code is
      // implemented.
      return;
    }
    setSubscriptionModalOpen(true);
  };
  return (
    <>
      <SubscriptionModal
        open={subscriptionModalOpen}
        onOpenChange={setSubscriptionModalOpen}
      />
      <div className="space-y-3">
        <Label className="text-sm font-semibold">Animations</Label>
        <div
          className="flex cursor-pointer items-center justify-between rounded-lg border p-3 hover:bg-accent/50"
          onClick={handlePremiumFeatureClick}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              event.currentTarget.click();
            }
          }}
        >
          <div className="flex items-center gap-2">
            <span className="text-sm">Enable animations</span>
            {hasAccess ? (
              <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-300">
                ✓ Active
              </span>
            ) : (
              <span className="flex items-center gap-1 rounded-full bg-linear-to-r from-amber-500 to-orange-500 px-2 py-0.5 text-xs font-semibold text-white">
                <span>👑</span> PRO
              </span>
            )}
          </div>
          <div className="pointer-events-none">
            <input
              aria-label="premium features section control"
              type="checkbox"
              className="sr-only"
            />
            <div
              className={`relative h-6 w-11 rounded-full ${
                hasAccess ? "bg-primary" : "bg-muted"
              }`}
            >
              <div
                className={`absolute top-1 size-4 rounded-full bg-background transition-transform ${
                  hasAccess ? "translate-x-5" : "left-1"
                }`}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <Label className="text-sm font-semibold">Branding</Label>
        <div
          className="flex cursor-pointer items-center justify-between rounded-lg border p-3 hover:bg-accent/50"
          onClick={handlePremiumFeatureClick}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              event.currentTarget.click();
            }
          }}
        >
          <div className="flex items-center gap-2">
            <span className="text-sm">Remove Smart Presentations branding</span>
            {hasAccess ? (
              <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-300">
                ✓ Active
              </span>
            ) : (
              <span className="flex items-center gap-1 rounded-full bg-linear-to-r from-amber-500 to-orange-500 px-2 py-0.5 text-xs font-semibold text-white">
                <span>👑</span> PRO
              </span>
            )}
          </div>
          <div className="pointer-events-none">
            <input
              aria-label="premium features section control"
              type="checkbox"
              className="sr-only"
            />
            <div
              className={`relative h-6 w-11 rounded-full ${
                hasAccess ? "bg-primary" : "bg-muted"
              }`}
            >
              <div
                className={`absolute top-1 size-4 rounded-full bg-background transition-transform ${
                  hasAccess ? "translate-x-5" : "left-1"
                }`}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
