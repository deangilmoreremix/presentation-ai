// Supabase-backed data layer. Replaces the previous no-op stub with a real
// implementation that mirrors the Prisma-like interface the server actions use.
// Structured queries go through @supabase/supabase-js (service role); raw SQL
// ($executeRaw / $queryRaw) goes through a direct pg pool against the same DB.

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { pgPool } from "@/lib/supabase/pg";

/* eslint-disable @typescript-eslint/no-explicit-any */

type Json = any;

const MODEL_TABLE: Record<string, string> = {
  baseDocument: "base_documents",
  presentation: "presentations",
  presentationTheme: "presentation_themes",
  presentationThemeLike: "presentation_theme_likes",
  favoritePresentationTheme: "favorite_presentation_themes",
  fontPair: "font_pairs",
  generatedImage: "generated_images",
  user: "users",
};

const HAS_UPDATED_AT = new Set([
  "base_documents",
  "presentations",
  "presentation_themes",
  "font_pairs",
  "generated_images",
  "users",
]);

// Relation metadata: for a given parent model, how to resolve each relation
// without relying on Supabase's auto-detected relationship names.
const RELATIONS: Record<string, Record<string, Relation>> = {
  baseDocument: {
    presentation: { table: "presentations", model: "presentation", type: "one", localKey: "id", refKey: "id" },
    user: { table: "users", model: "user", type: "one", localKey: "userId", refKey: "id" },
    favorites: { table: "favorite_documents", model: "favoriteDocument", type: "many", localKey: "id", refKey: "documentId" },
  },
  presentationTheme: {
    user: { table: "users", model: "user", type: "one", localKey: "userId", refKey: "id" },
    presentationThemeLikes: { table: "presentation_theme_likes", model: "presentationThemeLike", type: "many", localKey: "id", refKey: "themeId" },
    favoritePresentationThemes: { table: "favorite_presentation_themes", model: "favoritePresentationTheme", type: "many", localKey: "id", refKey: "themeId" },
  },
  favoritePresentationTheme: {
    theme: { table: "presentation_themes", model: "presentationTheme", type: "one", localKey: "themeId", refKey: "id" },
  },
};

interface Relation {
  table: string;
  model: string;
  type: "one" | "many";
  localKey: string;
  refKey: string;
}

function sb() {
  return getSupabaseAdmin();
}

function removeUndefined(obj: Record<string, any>) {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}

function topSelect(select?: Record<string, any>) {
  if (select && typeof select === "object") {
    const fields = Object.keys(select).filter((k) => select[k]);
    if (fields.length) return fields.join(",");
  }
  return "*";
}

function applyWhere(qb: any, where: Record<string, any> | undefined): any {
  if (!where) return qb;
  for (const [key, val] of Object.entries(where)) {
    if (val === undefined) continue;
    if (key === "OR") {
      const orParts = (val as any[]).map(condToOrToken).filter(Boolean);
      if (orParts.length) qb = qb.or(orParts.join(","));
      continue;
    }
    if (val !== null && typeof val === "object" && !Array.isArray(val)) {
      if ("in" in val) {
        qb = qb.in(key, (val as any).in);
        continue;
      }
      if ("not" in val) {
        qb = qb.neq(key, (val as any).not);
        continue;
      }
      if ("contains" in val) {
        qb = qb.ilike(key, `%${(val as any).contains}%`);
        continue;
      }
      // Composite unique key e.g. { userId, themeId }
      for (const [sk, sv] of Object.entries(val as Record<string, any>)) {
        qb = qb.eq(sk, sv);
      }
      continue;
    }
    qb = qb.eq(key, val);
  }
  return qb;
}

function condToOrToken(cond: Record<string, any>): string {
  const parts = Object.entries(cond).map(([k, v]) => {
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      if ("in" in v) return `${k}.in.(${(v as any).in.join(",")})`;
      if ("not" in v) return `${k}.neq.${v.not}`;
    }
    return `${k}.eq.${v}`;
  });
  return parts.length > 1 ? `and(${parts.join(",")})` : parts[0];
}

function applyOrderBy(qb: any, orderBy: any): any {
  const entries = Array.isArray(orderBy)
    ? orderBy.flatMap((o: any) => Object.entries(o))
    : Object.entries(orderBy);
  for (const [field, dir] of entries) {
    qb = qb.order(field, { ascending: dir !== "desc" });
  }
  return qb;
}

function matchWhere(row: any, where: Record<string, any>): boolean {
  return Object.entries(where).every(([k, v]) => {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      if ("in" in v) return (v as any).in.includes(row[k]);
      if ("not" in v) return row[k] !== (v as any).not;
    }
    return row[k] === v;
  });
}

function project(row: any, select: Record<string, any>): any {
  const out: any = {};
  for (const k of Object.keys(select)) {
    if (select[k]) out[k] = row[k];
  }
  return out;
}

async function resolveCount(rows: any[], model: string, countSpec: any) {
  const rels = RELATIONS[model] || {};
  const select = countSpec?.select || {};
  for (const [relName, _] of Object.entries(select)) {
    const rel = rels[relName as string];
    if (!rel) continue;
    for (const row of rows) {
      const { count, error } = await sb()
        .from(rel.table)
        .select("*", { count: "exact", head: true })
        .eq(rel.refKey, row[rel.localKey]);
      if (error) throw error;
      row._count = { ...(row._count || {}), [relName]: count ?? 0 };
    }
  }
}

async function resolveIncludes(rows: any[], model: string, includeSpec: any): Promise<any[]> {
  if (!includeSpec || !rows.length) return rows;
  const rels = RELATIONS[model] || {};
  for (const [relName, relSpec] of Object.entries(includeSpec)) {
    if (!relSpec) continue;
    if (relName === "_count") {
      await resolveCount(rows, model, relSpec);
      continue;
    }
    const rel = rels[relName];
    if (!rel) continue;
    const isOne = rel.type === "one";
    const localValues = [...new Set(rows.map((r) => r[rel.localKey]))].filter((v) => v != null);
    if (!localValues.length) {
      for (const r of rows) r[relName] = isOne ? null : [];
      continue;
    }
    const { data, error } = await sb().from(rel.table).select("*").in(rel.refKey, localValues);
    if (error) throw error;
    const related: any[] = data || [];
    const byKey = new Map<any, any>();
    for (const rr of related) {
      const k = rr[rel.refKey];
      if (!byKey.has(k)) byKey.set(k, isOne ? rr : []);
      if (!isOne) byKey.get(k).push(rr);
    }
    for (const row of rows) {
      let matched = byKey.get(row[rel.localKey]) ?? (isOne ? null : []);
      if (!isOne) {
        const w = (relSpec as any)?.where;
        if (w) matched = matched.filter((m: any) => matchWhere(m, w));
        const sel = (relSpec as any)?.select;
        if (sel) matched = matched.map((m: any) => project(m, sel));
        const inc = (relSpec as any)?.include;
        if (inc) matched = await resolveIncludes(matched, rel.model, inc);
      } else if (matched) {
        const sel = (relSpec as any)?.select;
        if (sel) matched = project(matched, sel);
        const inc = (relSpec as any)?.include;
        if (inc) matched = (await resolveIncludes([matched], rel.model, inc))[0];
      }
      row[relName] = matched;
    }
  }
  return rows;
}

function createModel(model: string) {
  const table = MODEL_TABLE[model];

  async function insertRow(data: Record<string, any>) {
    const clean = removeUndefined(data);
    if (HAS_UPDATED_AT.has(table)) clean.updatedAt = new Date().toISOString();
    const { data: row, error } = await sb().from(table).insert(clean).select("*").single();
    if (error) throw error;
    return row;
  }

  async function updateRow(where: Record<string, any>, data: Record<string, any>) {
    const clean = removeUndefined(data);
    if (HAS_UPDATED_AT.has(table)) clean.updatedAt = new Date().toISOString();
    let qb: any = sb().from(table).update(clean);
    qb = applyWhere(qb, where);
    const { error } = await qb;
    if (error) throw error;
  }

  return {
    async create({ data, include }: { data: any; include?: any }) {
      const parentData: any = { ...data };
      const nested: { key: string; childData: any }[] = [];
      for (const key of Object.keys(parentData)) {
        const v = parentData[key];
        if (v && typeof v === "object" && !Array.isArray(v) && (v as any).create && RELATIONS[model]?.[key]) {
          nested.push({ key, childData: (v as any).create });
          delete parentData[key];
        }
      }
      const row = await insertRow(parentData);
      for (const { key, childData } of nested) {
        const rel = RELATIONS[model][key];
        const childRow = { ...childData, [rel.refKey]: row[rel.localKey] };
        await insertRow(childRow);
      }
      if (include) {
        return (await resolveIncludes([row], model, include))[0];
      }
      return row;
    },

    async findUnique({ where, include, select }: { where: any; include?: any; select?: any }) {
      let qb: any = sb().from(table).select(include ? "*" : topSelect(select));
      qb = applyWhere(qb, where);
      const { data, error } = await qb.maybeSingle();
      if (error) throw error;
      if (!data) return null;
      if (include) return (await resolveIncludes([data], model, include))[0];
      return data;
    },

    async findFirst({ where, include, select }: { where: any; include?: any; select?: any }) {
      let qb: any = sb().from(table).select(include ? "*" : topSelect(select));
      qb = applyWhere(qb, where);
      const { data, error } = await qb.limit(1).maybeSingle();
      if (error) throw error;
      if (!data) return null;
      if (include) return (await resolveIncludes([data], model, include))[0];
      return data;
    },

    async findMany({ where, orderBy, take, skip, include, select }: any = {}) {
      let qb: any = sb().from(table).select(include ? "*" : topSelect(select));
      qb = applyWhere(qb, where);
      if (orderBy) qb = applyOrderBy(qb, orderBy);
      const from = skip ?? 0;
      const to = from + (take ?? 1000) - 1;
      qb = qb.range(from, to);
      const { data, error } = await qb;
      if (error) throw error;
      let rows = data || [];
      if (include) rows = await resolveIncludes(rows, model, include);
      return rows;
    },

    async update({ where, data, include }: { where: any; data: any; include?: any }) {
      const parentData: any = { ...data };
      const nested: { key: string; childData: any }[] = [];
      for (const key of Object.keys(parentData)) {
        const v = parentData[key];
        if (v && typeof v === "object" && !Array.isArray(v) && (v as any).update && RELATIONS[model]?.[key]) {
          nested.push({ key, childData: (v as any).update });
          delete parentData[key];
        }
      }
      await updateRow(where, parentData);
      for (const { key, childData } of nested) {
        const rel = RELATIONS[model][key];
        const childWhere = { [rel.refKey]: where.id ?? where[rel.refKey] };
        let cqb: any = sb().from(rel.table).update(removeUndefined(childData));
        cqb = applyWhere(cqb, childWhere);
        const { error } = await cqb;
        if (error) throw error;
      }
      if (include) {
        return (await resolveIncludes([(await findOneWhere(where, table, model))], model, include))[0];
      }
      return await findOneWhere(where, table, model);
    },

    async delete({ where }: { where: any }) {
      let qb: any = sb().from(table).delete();
      qb = applyWhere(qb, where);
      const { error } = await qb;
      if (error) throw error;
    },

    async deleteMany({ where }: { where: any }) {
      let qb: any = sb().from(table).delete({ count: "exact", head: true });
      qb = applyWhere(qb, where);
      const { count, error } = await qb;
      if (error) throw error;
      return { count: count ?? 0 };
    },

    async count({ where }: { where?: any } = {}) {
      let qb: any = sb().from(table).select("*", { count: "exact", head: true });
      qb = applyWhere(qb, where);
      const { count, error } = await qb;
      if (error) throw error;
      return count ?? 0;
    },

    async groupBy({ by, where, _count }: { by: string[]; where?: any; _count?: any }) {
      let qb: any = sb().from(table).select("*");
      qb = applyWhere(qb, where);
      const { data, error } = await qb;
      if (error) throw error;
      const rows = data || [];
      const groups = new Map<string, any>();
      for (const row of rows) {
        const key = by.map((b) => String(row[b])).join("::");
        if (!groups.has(key)) {
          const entry: any = {};
          for (const b of by) entry[b] = row[b];
          entry._count = { id: 0 };
          groups.set(key, entry);
        }
        groups.get(key)._count.id += 1;
      }
      return Array.from(groups.values());
    },
  };
}

async function findOneWhere(where: any, table: string, model: string) {
  let qb: any = sb().from(table).select("*");
  qb = applyWhere(qb, where);
  const { data, error } = await qb.maybeSingle();
  if (error) throw error;
  return data;
}

function rawQuery(strings: TemplateStringsArray, ...values: any[]) {
  const text = strings.reduce((acc, s, i) => acc + s + (i < values.length ? `$${i + 1}` : ""), "");
  return pgPool.query(text, values);
}

export const db = {
  baseDocument: createModel("baseDocument"),
  presentation: createModel("presentation"),
  presentationTheme: createModel("presentationTheme"),
  presentationThemeLike: createModel("presentationThemeLike"),
  favoritePresentationTheme: createModel("favoritePresentationTheme"),
  fontPair: createModel("fontPair"),
  generatedImage: createModel("generatedImage"),
  user: createModel("user"),

  async $transaction(statements: Promise<any>[]) {
    return Promise.all(statements);
  },
  $executeRaw(strings: TemplateStringsArray, ...values: any[]) {
    return rawQuery(strings, ...values).then(() => undefined);
  },
  $queryRaw(strings: TemplateStringsArray, ...values: any[]) {
    return rawQuery(strings, ...values).then((r) => r.rows);
  },
};

export default db;
