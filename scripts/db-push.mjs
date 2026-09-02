#!/usr/bin/env node

/**
 * Applies Supabase migrations to the database.
 *
 * Usage:
 *   pnpm db:push
 *
 * Environment:
 *   DATABASE_URL - PostgreSQL connection string (required)
 *
 * Options:
 *   DRY_RUN=1 - print migrations without applying
 */

import { execSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");
const DATABASE_URL = process.env.DATABASE_URL;
const DRY_RUN = process.env.DRY_RUN === "1";

function main() {
  if (!DATABASE_URL && !DRY_RUN) {
    console.error("ERROR: DATABASE_URL environment variable is required");
    console.error("Set it in your .env file or export it before running this script");
    console.error("Or set DRY_RUN=1 to validate migration ordering without applying");
    process.exit(1);
  }

  console.log("Applying Supabase migrations...");

  // Get all migration files and sort them
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort((a, b) => {
      const aNum = parseInt(a.split("_")[0], 10);
      const bNum = parseInt(b.split("_")[0], 10);
      return aNum - bNum;
    });

  console.log(`Found ${files.length} migration(s) in ${MIGRATIONS_DIR}`);

  if (DRY_RUN) {
    console.log("\nDry-run mode - migrations that would be applied:");
    for (const file of files) {
      console.log(`  ${file}`);
    }
    console.log("\nDry-run complete. Set DATABASE_URL and re-run to apply.");
    return;
  }

  let applied = 0;
  let failed = 0;

  for (const file of files) {
    const filePath = join(MIGRATIONS_DIR, file);
    console.log(`Applying: ${file}`);

    try {
      const sql = readFileSync(filePath, "utf-8");
      execSync(`psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -c "${sql.replace(/"/g, '\\"')}"`, {
        stdio: "pipe",
      });
      applied++;
      console.log(`  ✓ Applied`);
    } catch (error) {
      failed++;
      console.error(`  ✗ Failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  console.log(`\nResults: ${applied} applied, ${failed} failed`);

  if (failed > 0) {
    process.exit(1);
  }
}

main();
