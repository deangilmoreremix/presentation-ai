import { Client } from "pg";

const client = new Client({
  host: "db.bzxohkrxcwodllketcpz.supabase.co",
  port: 5432,
  user: "postgres",
  password: "VideoRemix2026",
  database: "postgres",
  ssl: { rejectUnauthorized: false },
});

await client.connect();
const tables = await client.query(`
  select table_name
  from information_schema.tables
  where table_schema = 'public'
    and table_type = 'BASE TABLE'
  order by table_name;
`);
console.log("Public tables:");
for (const r of tables.rows) console.log("  ", r.table_name);

const policies = await client.query(`
  select tablename, policyname, roles, cmd
  from pg_policies
  where schemaname = 'public'
  order by tablename;
`);
console.log("\nPolicies:");
for (const r of policies.rows) console.log("  ", r.tablename, r.policyname, r.roles, r.cmd);

await client.end();