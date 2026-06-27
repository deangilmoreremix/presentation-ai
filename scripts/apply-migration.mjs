import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "pg";

const here = dirname(fileURLToPath(import.meta.url));
const sql = await readFile(
  resolve(here, "../supabase/migrations/0001_initial.sql"),
  "utf8",
);

const client = new Client({
  host: "db.bzxohkrxcwodllketcpz.supabase.co",
  port: 5432,
  user: "postgres",
  password: "VideoRemix2026",
  database: "postgres",
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  await client.query(sql);
  console.log("Migration applied successfully");
} catch (err) {
  console.error("Migration failed:", err);
  process.exitCode = 1;
} finally {
  await client.end();
}