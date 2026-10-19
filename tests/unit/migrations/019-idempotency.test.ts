import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");

function read(version: string): string {
  return readFileSync(join(MIGRATIONS_DIR, version), "utf8");
}

describe("migration 019 (MuAPI credential storage)", () => {
  const sql = read("019_muapi_credential_storage.sql");

  it("only adds columns to public.users and touches nothing else", () => {
    const tables =
      sql.match(/(?:alter|drop|rename)\s+table\s+(?:if\s+exists\s+)?([\w.]+)/gi) ??
      [];
    expect(tables.length).toBeGreaterThan(0);
    for (const statement of tables) {
      expect(statement.toLowerCase()).toContain("public.users");
    }
    // No destructive statements anywhere in the file.
    for (const forbidden of [
      "drop table",
      "drop column",
      "rename to",
      "truncate",
      "delete from",
    ]) {
      expect(sql.toLowerCase()).not.toContain(forbidden);
    }
  });

  it("is idempotent: every column add is guarded by if not exists", () => {
    // The statement packs all four columns into one ALTER, so split the clause
    // list rather than the statement list.
    const alter = sql.match(/alter\s+table[\s\S]*?;/i)?.[0] ?? "";
    const adds = alter.match(/add\s+column[^,]+/gi) ?? [];
    expect(adds).toHaveLength(4);
    for (const clause of adds) {
      expect(clause.toLowerCase()).toContain("add column if not exists");
    }
  });

  it("declares the MuAPI ciphertext and IV columns the code expects", () => {
    // src/lib/ai/provider-credentials.ts KEY_COLUMNS.muapi must resolve to real
    // columns, or every MuAPI save silently writes to a missing field.
    expect(sql).toContain("muapi_api_key_encrypted");
    expect(sql).toContain("muapi_api_key_iv");
    expect(sql).toContain("openai_last_validated_at");
    expect(sql).toContain("muapi_last_validated_at");
  });

  it("does not weaken the RLS isolation that guards the credential columns", () => {
    // 019 relies on 007's existing `auth.uid() = id` policies instead of adding
    // its own. If 007 ever lost them, cross-user credential reads would become
    // possible, so assert the policies 019 depends on are still there.
    const rls = read("007_rls_policies.sql");
    expect(rls).toContain("auth.uid() = id");
    expect(rls).toContain("users_select_self");
    expect(rls).toContain("users_update_self");
    expect(rls.toLowerCase()).toContain("enable row level security");
    // 019 must not carry a permissive policy of its own that bypasses them.
    expect(sql.toLowerCase()).not.toContain("create policy");
    expect(sql.toLowerCase()).not.toContain("to anon");
  });

  it("keeps the same column contract as the OpenAI migration 012", () => {
    const twelve = read("012_user_api_key_storage.sql");
    expect(twelve).toContain("openai_api_key_encrypted");
    expect(twelve).toContain("openai_api_key_iv");
    // Column ordering is a detail; the paired ciphertext/IV contract is not.
    expect(sql).toMatch(/muapi_api_key_encrypted\s+text/);
    expect(sql).toMatch(/muapi_api_key_iv\s+text/);
  });

  it("is still marked as staged, not applied to a shared database", () => {
    expect(sql.toLowerCase()).toContain("staged");
    expect(sql.toLowerCase()).toContain("approval");
  });
});
