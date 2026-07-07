import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { Pool } from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sql = readFileSync(join(__dirname, "..", "supabase", "schema.sql"), "utf8");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }
  // Run each statement separately so transaction DDL behaves predictably.
  const statements = sql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const statement of statements) {
    await pool.query(statement);
  }
  console.log(`Applied ${statements.length} statements to Supabase Postgres.`);
}

main()
  .then(() => pool.end())
  .catch((err) => {
    console.error("Failed to apply schema:", err);
    pool.end();
    process.exit(1);
  });
