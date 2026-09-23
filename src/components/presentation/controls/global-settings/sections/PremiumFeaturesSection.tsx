"use client";

import { Label } from "@/components/ui/label";
import { usePresentationState } from "@/states/presentation-state";

/**
 * Features section — all features are available to all users.
 *
 * Previously gated behind a Clerk `hasAccess` paywall. The paywall
 * has been removed; both toggles control editor-level features that
 * are available to everyone.
 */
export function PremiumFeaturesSection() {
  const brandingRemoved = usePresentationState(
    (state) => state.brandingRemoved,
  );
  const setBrandingRemoved = usePresentationState(
    (state) => state.setBrandingRemoved,
  );
  const animationsEnabled = usePresentationState(
    (state) => state.animationsEnabled,
  );
  const setAnimationsEnabled = usePresentationState(
    (state) => state.setAnimationsEnabled,
  );

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Label className="text-sm font-semibold">Animations</Label>
        <div
          className="flex cursor-pointer items-center justify-between rounded-lg border p-3 hover:bg-accent/50"
          onClick={() => setAnimationsEnabled(!animationsEnabled)}
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
            <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-300">
              ✓ Available
            </span>
          </div>
          <div className="pointer-events-none">
            <input
              aria-label="animations toggle"
              type="checkbox"
              className="sr-only"
              checked={animationsEnabled}
              readOnly
            />
            <div
              className={`relative h-6 w-11 rounded-full transition-colors ${
                animationsEnabled ? "bg-primary" : "bg-muted"
              }`}
            >
              <div
                className={`absolute top-1 size-4 rounded-full bg-background transition-transform ${
                  animationsEnabled ? "translate-x-5" : "left-1"
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
          onClick={() => setBrandingRemoved(!brandingRemoved)}
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
            <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-300">
              ✓ Available
            </span>
          </div>
          <div className="pointer-events-none">
            <input
              aria-label="branding removal toggle"
              type="checkbox"
              className="sr-only"
              checked={brandingRemoved}
              readOnly
            />
            <div
              className={`relative h-6 w-11 rounded-full transition-colors ${
                brandingRemoved ? "bg-primary" : "bg-muted"
              }`}
            >
              <div
                className={`absolute top-1 size-4 rounded-full bg-background transition-transform ${
                  brandingRemoved ? "translate-x-5" : "left-1"
                }`}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
