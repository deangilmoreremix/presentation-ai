import { Pool } from "pg";

/**
 * Direct Postgres pool used for raw SQL ($executeRaw / $queryRaw) that the
 * Supabase JS REST client cannot express. Both target the same Supabase
 * Postgres database.
 */
export const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  // Supabase's Postgres certificate chain is not trusted by Node's default CA
  // store; this is the documented Supabase recommendation for node-postgres.
  ssl: { rejectUnauthorized: false },
});
