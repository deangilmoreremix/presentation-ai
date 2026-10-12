#!/usr/bin/env node
/**
 * Build preflight.
 *
 * Fails fast with an actionable message when a variable the build genuinely
 * requires is absent from the environment, instead of spending a full
 * compilation before Next.js fails deep inside prerendering.
 *
 * Safety: this script never prints, echoes, or persists any value. It checks
 * presence only. The Clerk publishable key is a public key and belongs in the
 * deploy environment, never in Git.
 */

const REQUIRED_BUILD_VARS = [
  {
    name: "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
    why:
      "Required at build time: ClerkProvider renders during static generation of /_not-found. " +
      "Set it in the deploy environment's BUILD scope for this deploy context. " +
      "NEXT_PUBLIC_* values are inlined at build time, so a runtime-only scope does not help.",
  },
];

const missing = REQUIRED_BUILD_VARS.filter(({ name }) => {
  const value = process.env[name];
  return typeof value !== "string" || value.trim().length === 0;
});

if (missing.length > 0) {
  const lines = [
    "",
    "╔══════════════════════════════════════════════════════════╗",
    "║  Build preflight failed — missing required configuration ║",
    "╚══════════════════════════════════════════════════════════╝",
    "",
  ];

  for (const { name, why } of missing) {
    lines.push(`  ${name}`, `      ${why}`, "");
  }

  lines.push(
    "  Fix this in the Netlify UI: Site configuration → Environment variables.",
    "  Do not commit credentials to the repository.",
    "",
  );

  console.error(lines.join("\n"));
  process.exit(1);
}

console.log(
  `Build preflight passed (${REQUIRED_BUILD_VARS.length} required variable${
    REQUIRED_BUILD_VARS.length === 1 ? "" : "s"
  } present).`,
);
