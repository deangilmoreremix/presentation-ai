/**
 * Supabase-backed implementation of the Prisma-style `db` facade.
 *
 * Each operation uses snake_case columns from the Supabase tables listed in
 * the task description, while accepting the camelCase Prisma-style arguments
 * used throughout the codebase.
 */

import { createClient } from "@/lib/supabase/server";

type AnyArgs = Record<string, any> | undefined;

type OrderDirection = "asc" | "desc";

const CAMEL_TO_SNAKE: Record<string, string> = {
  userId: "user_id",
  openaiApiKeyEncrypted: "openai_api_key_encrypted",
  openaiApiKeyIv: "openai_api_key_iv",
  documentId: "document_id",
  documentType: "document_type",
  thumbnailUrl: "thumbnail_url",
  isPublic: "is_public",
  isAdmin: "is_admin",
  createdAt: "created_at",
  updatedAt: "updated_at",
  themeId: "theme_id",
  imageUrl: "image_url",
  url: "url",
  prompt: "prompt",
  modelId: "model_id",
  model: "model",
  format: "format",
  compression: "compression",
  background: "background",
  action: "action",
  previousResponseId: "previous_response_id",
  inputImages: "input_images",
  logoUrl: "logo_url",
  themeData: "theme_data",
  slidesCount: "slides_count",
  headingUrl: "heading_url",
  bodyUrl: "body_url",
  headingWeight: "heading_weight",
  bodyWeight: "body_weight",
  emailVerified: "email_verified",
  hasAccess: "has_access",
  searchResults: "search_results",
  imageSource: "image_source",
  presentationStyle: "presentation_style",
  templateId: "template_id",
  baseDocumentId: "base_document_id",
};

function toSnakeKey(key: string): string {
  return CAMEL_TO_SNAKE[key] ?? key;
}

function mapKeysToSnake<T extends Record<string, any>>(obj: T): Record<string, any> {
  if (!obj || typeof obj !== "object") return obj;
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[toSnakeKey(k)] = v;
  }
  return out;
}

function mapRowToCamel<T extends Record<string, any>>(row: T): Record<string, any> {
  if (!row || typeof row !== "object") return row;
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(row)) {
    const camelKey = Object.keys(CAMEL_TO_SNAKE).find((c) => CAMEL_TO_SNAKE[c] === k) ?? k;
    if (k === "created_at" || k === "updated_at" || k === "email_verified") {
      out[camelKey] = v ? new Date(v as string) : v;
    } else {
      out[camelKey] = v;
    }
  }
  return out;
}

async function getSupabase() {
  return createClient();
}

type Filter = Record<string, any>;

function applyWhereToQuery(qb: any, where: Filter | undefined): any {
  if (!where) return qb;
  for (const [key, value] of Object.entries(where)) {
    if (value === undefined) continue;
    if (key === "OR" && Array.isArray(value)) {
      // Supabase PostgREST: use or= filter syntax
      const parts = value.map((cond: Filter) => buildOrPart(cond)).filter(Boolean);
      if (parts.length) qb = qb.or(parts.join(","));
      continue;
    }
    if (key === "AND" && Array.isArray(value)) {
      for (const cond of value) qb = applyWhereToQuery(qb, cond);
      continue;
    }
    if (value && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date)) {
      // operators like { in: [...], not: ..., gt: ..., contains: ... }
      for (const [op, opVal] of Object.entries(value)) {
        if (opVal === undefined) continue;
        const col = toSnakeKey(key);
        if (op === "in") {
          qb = qb.in(col, opVal);
        } else if (op === "not") {
          qb = qb.neq(col, opVal);
        } else if (op === "notIn") {
          const arr = Array.isArray(opVal) ? opVal : [];
          qb = qb.not(col, "in", `(${arr.map((v: any) => `"${v}"`).join(",")})`);
        } else if (op === "contains") {
          qb = qb.contains(col, opVal);
        } else if (op === "startsWith") {
          qb = qb.ilike(col, `${opVal}%`);
        } else if (op === "endsWith") {
          qb = qb.ilike(col, `%${opVal}`);
        } else if (op === "mode" && typeof opVal === "string") {
          qb = qb.ilike(col, `%${value.like ?? value.contains ?? ""}%`);
        } else if (op === "equals" || op === "is") {
          qb = qb.eq(col, opVal);
        } else if (op === "lt") {
          qb = qb.lt(col, opVal);
        } else if (op === "lte") {
          qb = qb.lte(col, opVal);
        } else if (op === "gt") {
          qb = qb.gt(col, opVal);
        } else if (op === "gte") {
          qb = qb.gte(col, opVal);
        } else if (op === "like") {
          qb = qb.like(col, opVal);
        } else if (op === "null") {
          qb = opVal ? qb.is(col, null) : qb.not(col, "is", null);
        }
      }
    } else {
      qb = qb.eq(toSnakeKey(key), value);
    }
  }
  return qb;
}

function buildOrPart(cond: Filter): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(cond)) {
    if (v === undefined) continue;
    const col = toSnakeKey(k);
    if (v && typeof v === "object" && !Array.isArray(v)) {
      if ("in" in v) parts.push(`${col}.in.(${v.in.join(",")})`);
      else if ("equals" in v) parts.push(`${col}.eq.${v.equals}`);
      else if ("not" in v) parts.push(`${col}.neq.${v.not}`);
      else parts.push(`${col}.eq.${v}`);
    } else {
      parts.push(`${col}.eq.${v}`);
    }
  }
  return parts.join(",");
}

function applyOrder(qb: any, orderBy: Record<string, OrderDirection> | undefined): any {
  if (!orderBy) return qb;
  for (const [col, dir] of Object.entries(orderBy)) {
    qb = qb.order(toSnakeKey(col), { ascending: dir === "asc" });
  }
  return qb;
}

function applySelect(row: any, select: Record<string, any> | undefined): any {
  if (!select || !row) return row;
  const out: Record<string, any> = {};
  for (const k of Object.keys(select)) {
    if (select[k]) out[k] = row[k];
  }
  return out;
}

async function loadIncludes(
  table: string,
  rows: any[],
  include: Record<string, any> | undefined,
  supabase: any,
) {
  if (!include || rows.length === 0) return rows;
  const enriched = rows.map((r) => ({ ...r }));

  for (const [relKey, relVal] of Object.entries(include)) {
    if (!relVal) continue;
    if (relKey === "_count") {
      const countSelects = relVal.select ?? {};
      for (const [countRel] of Object.entries(countSelects)) {
        const fkCol = fkColumnFor(countRel, table);
        const ids = enriched.map((r) => r.id);
        if (ids.length === 0) {
          enriched.forEach((r) => {
            r._count = { ...(r._count ?? {}), [countRel]: 0 };
          });
          continue;
        }
        const byId = new Map<string, number>();
        for (const id of ids) byId.set(id, 0);
        // We can't aggregate counts per parent via Supabase JS easily; fall back to per-id counts
        for (const id of ids) {
          const { count: c } = await supabase
            .from(relTableFor(countRel))
            .select("id", { count: "exact", head: true })
            .eq(fkCol, id);
          byId.set(id, c ?? 0);
        }
        enriched.forEach((r) => {
          r._count = { ...(r._count ?? {}), [countRel]: byId.get(r.id) ?? 0 };
        });
      }
    } else if (relKey === "presentation") {
      const ids = enriched.map((r) => r.id);
      const { data } = await supabase.from("presentations").select("*").in("id", ids);
      const byId = new Map((data ?? []).map((d: any) => [d.id, mapRowToCamel(d)]));
      enriched.forEach((r) => {
        r.presentation = byId.get(r.id) ?? null;
      });
    } else if (relKey === "user") {
      const userIds = enriched.map((r) => r.user_id ?? r.userId);
      const { data } = await supabase.from("users").select("*").in("id", userIds);
      const byId = new Map((data ?? []).map((d: any) => [d.id, mapRowToCamel(d)]));
      enriched.forEach((r) => {
        const uid = r.user_id ?? r.userId;
        const u = byId.get(uid);
        if (relVal?.select) {
          r.user = applySelect(u, relVal.select);
        } else {
          r.user = u ?? null;
        }
      });
    } else if (relKey === "theme") {
      const themeIds = enriched.map((r) => r.theme_id ?? r.themeId);
      const { data } = await supabase.from("presentation_themes").select("*").in("id", themeIds);
      const byId = new Map((data ?? []).map((d: any) => [d.id, mapRowToCamel(d)]));
      enriched.forEach((r) => {
        const tid = r.theme_id ?? r.themeId;
        r.theme = byId.get(tid) ?? null;
      });
    } else if (relKey === "favorites") {
      const docIds = enriched.map((r) => r.id);
      const filter: Filter = relVal?.where ?? {};
      const { data } = await supabase
        .from("favorite_presentation_themes")
        .select("*")
        .in("theme_id", docIds);
      const grouped = new Map<string, any[]>();
      for (const f of data ?? []) {
        const arr = grouped.get(f.theme_id) ?? [];
        arr.push(mapRowToCamel(f));
        grouped.set(f.theme_id, arr);
      }
      enriched.forEach((r) => {
        let arr = grouped.get(r.id) ?? [];
        if (filter.userId) arr = arr.filter((f) => f.userId === filter.userId);
        if (relVal?.select) arr = arr.map((f) => applySelect(f, relVal.select));
        r.favorites = arr;
      });
    } else if (relKey === "presentationThemeLikes") {
      const ids = enriched.map((r) => r.id);
      const filter: Filter = relVal?.where ?? {};
      const { data } = await supabase
        .from("presentation_theme_likes")
        .select("*")
        .in("theme_id", ids);
      const grouped = new Map<string, any[]>();
      for (const l of data ?? []) {
        const arr = grouped.get(l.theme_id) ?? [];
        arr.push(mapRowToCamel(l));
        grouped.set(l.theme_id, arr);
      }
      enriched.forEach((r) => {
        let arr = grouped.get(r.id) ?? [];
        if (filter.userId) arr = arr.filter((l) => l.userId === filter.userId);
        if (relVal?.select) arr = arr.map((l) => applySelect(l, relVal.select));
        r.presentationThemeLikes = arr;
      });
    } else if (relKey === "favoritePresentationThemes") {
      const ids = enriched.map((r) => r.id);
      const filter: Filter = relVal?.where ?? {};
      const { data } = await supabase
        .from("favorite_presentation_themes")
        .select("*")
        .in("theme_id", ids);
      const grouped = new Map<string, any[]>();
      for (const f of data ?? []) {
        const arr = grouped.get(f.theme_id) ?? [];
        arr.push(mapRowToCamel(f));
        grouped.set(f.theme_id, arr);
      }
      enriched.forEach((r) => {
        let arr = grouped.get(r.id) ?? [];
        if (filter.userId) arr = arr.filter((f) => f.userId === filter.userId);
        if (relVal?.select) arr = arr.map((f) => applySelect(f, relVal.select));
        r.favoritePresentationThemes = arr;
      });
    }
  }

  return enriched;
}

function fkColumnFor(relation: string, parent: string): string {
  if (relation === "presentationThemeLikes" && parent === "presentation_themes") return "theme_id";
  if (relation === "favoritePresentationThemes" && parent === "presentation_themes") return "theme_id";
  if (relation === "favorites" && parent === "base_documents") return "document_id";
  return `${toSnakeKey(parent.replace(/s$/, ""))}_id`;
}

function relTableFor(relation: string): string {
  if (relation === "presentationThemeLikes") return "presentation_theme_likes";
  if (relation === "favoritePresentationThemes") return "favorite_presentation_themes";
  if (relation === "favorites") return "favorite_documents";
  return "users";
}

// ---------- users ----------

const users = {
  async findUnique(args: AnyArgs) {
    const supabase = await getSupabase();
    const where = args?.where ?? {};
    let q = supabase.from("users").select("*");
    for (const [k, v] of Object.entries(where)) {
      if (v === undefined) continue;
      q = q.eq(toSnakeKey(k), v);
    }
    const { data, error } = await q.maybeSingle();
    if (error) throw error;
    return data ? mapRowToCamel(data) : null;
  },
  async upsert(args: AnyArgs) {
    const supabase = await getSupabase();
    const data = mapKeysToSnake(args?.data ?? {});
    if (!data.id) data.id = crypto.randomUUID();
    data.created_at = data.created_at ?? new Date().toISOString();
    data.updated_at = new Date().toISOString();
    const { data: row, error } = await supabase
      .from("users")
      .upsert(data, { onConflict: "id" })
      .select("*")
      .single();
    if (error) throw error;
    return row ? mapRowToCamel(row) : null;
  },
};

// ---------- generated_images ----------

const generatedImages = {
  async create(args: AnyArgs) {
    const supabase = await getSupabase();
    const data = mapKeysToSnake({ ...(args?.data ?? {}) });
    if (!data.id) data.id = crypto.randomUUID();
    data.created_at = data.created_at ?? new Date().toISOString();
    data.updated_at = data.updated_at ?? new Date().toISOString();
    const { data: row, error } = await supabase
      .from("generated_images")
      .insert(data)
      .select("*")
      .single();
    if (error) throw error;
    return mapRowToCamel(row);
  },
  async findMany(args: AnyArgs) {
    const supabase = await getSupabase();
    let q = supabase.from("generated_images").select("*");
    q = applyWhereToQuery(q, args?.where);
    q = applyOrder(q, args?.orderBy);
    if (typeof args?.take === "number") q = q.limit(args.take);
    if (typeof args?.skip === "number") {
      const off = args.skip;
      const lim = typeof args?.take === "number" ? args.take : 1000;
      q = q.range(off, off + lim - 1);
    }
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []).map(mapRowToCamel);
  },
};

// ---------- presentations ----------

const presentations = {
  async findUnique(args: AnyArgs) {
    const supabase = await getSupabase();
    const where = args?.where ?? {};
    let q = supabase.from("presentations").select("*");
    for (const [k, v] of Object.entries(where)) {
      if (v === undefined) continue;
      q = q.eq(toSnakeKey(k), v);
    }
    const { data, error } = await q.maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const row = mapRowToCamel(data);
    if (args?.select) return applySelect(row, args.select);
    return row;
  },
  async findMany(args: AnyArgs) {
    const supabase = await getSupabase();
    let q = supabase.from("presentations").select("*");
    q = applyWhereToQuery(q, args?.where);
    q = applyOrder(q, args?.orderBy);
    if (typeof args?.take === "number") q = q.limit(args.take);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []).map(mapRowToCamel);
  },
};

// ---------- base_documents ----------

const baseDocuments = {
  async create(args: AnyArgs) {
    const supabase = await getSupabase();
    const data = mapKeysToSnake({ ...(args?.data ?? {}) });
    if (!data.id) data.id = crypto.randomUUID();
    data.created_at = data.created_at ?? new Date().toISOString();
    data.updated_at = data.updated_at ?? new Date().toISOString();

    const presentationCreate = args?.data?.presentation?.create;
    if (presentationCreate) {
      presentationCreate.id = data.id;
    }

    const { data: row, error } = await supabase
      .from("base_documents")
      .insert(data)
      .select("*")
      .single();
    if (error) throw error;

    if (presentationCreate) {
      const presData = mapKeysToSnake({ ...presentationCreate });
      presData.id = row.id;
      const { error: perr } = await supabase.from("presentations").insert(presData);
      if (perr) throw perr;
    }

    const mapped = mapRowToCamel(row);
    if (args?.include?.presentation) {
      const { data: pres } = await supabase
        .from("presentations")
        .select("*")
        .eq("id", row.id)
        .maybeSingle();
      mapped.presentation = pres ? mapRowToCamel(pres) : null;
    }
    return mapped;
  },
  async findUnique(args: AnyArgs) {
    const supabase = await getSupabase();
    const where = args?.where ?? {};
    let q = supabase.from("base_documents").select("*");
    for (const [k, v] of Object.entries(where)) {
      if (v === undefined) continue;
      q = q.eq(toSnakeKey(k), v);
    }
    const { data, error } = await q.maybeSingle();
    if (error) throw error;
    if (!data) return null;
    let row = mapRowToCamel(data);
    if (args?.select) row = applySelect(row, args.select);
    if (args?.include) row = (await loadIncludes("base_documents", [row], args.include, supabase))[0];
    return row;
  },
  async findFirst(args: AnyArgs) {
    const supabase = await getSupabase();
    let q = supabase.from("base_documents").select("*");
    q = applyWhereToQuery(q, args?.where);
    q = applyOrder(q, args?.orderBy);
    q = q.limit(1);
    const { data, error } = await q.maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return mapRowToCamel(data);
  },
  async findMany(args: AnyArgs) {
    const supabase = await getSupabase();
    let q = supabase.from("base_documents").select("*");
    q = applyWhereToQuery(q, args?.where);
    q = applyOrder(q, args?.orderBy);
    if (typeof args?.take === "number") q = q.limit(args.take);
    if (typeof args?.skip === "number") {
      const off = args.skip;
      const lim = typeof args?.take === "number" ? args.take : 1000;
      q = q.range(off, off + lim - 1);
    }
    const { data, error } = await q;
    if (error) throw error;
    let rows = (data ?? []).map(mapRowToCamel);
    if (args?.include) rows = await loadIncludes("base_documents", rows, args.include, supabase);
    return rows;
  },
  async update(args: AnyArgs) {
    const supabase = await getSupabase();
    const where = args?.where ?? {};
    const data = mapKeysToSnake({ ...(args?.data ?? {}) });
    if (data.updated_at === undefined) data.updated_at = new Date().toISOString();

    const presentationUpdate = args?.data?.presentation?.update;

    const { data: row, error } = await supabase
      .from("base_documents")
      .update(data)
      .match(mapKeysToSnake(where))
      .select("*")
      .single();
    if (error) throw error;

    if (presentationUpdate) {
      const pdata = mapKeysToSnake({ ...presentationUpdate });
      const { error: perr } = await supabase
        .from("presentations")
        .update(pdata)
        .eq("id", row.id);
      if (perr) throw perr;
    }

    const mapped = mapRowToCamel(row);
    if (args?.include?.presentation) {
      const { data: pres } = await supabase
        .from("presentations")
        .select("*")
        .eq("id", row.id)
        .maybeSingle();
      mapped.presentation = pres ? mapRowToCamel(pres) : null;
    }
    return mapped;
  },
  async updateMany(args: AnyArgs) {
    const supabase = await getSupabase();
    const data = mapKeysToSnake({ ...(args?.data ?? {}) });
    if (data.updated_at === undefined) data.updated_at = new Date().toISOString();
    let q = supabase.from("base_documents").update(data);
    q = applyWhereToQuery(q, args?.where);
    const { data: rows, error } = await q.select("id");
    if (error) throw error;
    return { count: (rows ?? []).length };
  },
  async deleteMany(args: AnyArgs) {
    const supabase = await getSupabase();
    let q = supabase.from("base_documents").delete();
    q = applyWhereToQuery(q, args?.where);
    const { data: rows, error } = await q.select("id");
    if (error) throw error;
    return { count: (rows ?? []).length };
  },
  async count(args: AnyArgs) {
    const supabase = await getSupabase();
    let q = supabase.from("base_documents").select("id", { count: "exact", head: true });
    q = applyWhereToQuery(q, args?.where);
    const { count, error } = await q;
    if (error) throw error;
    return count ?? 0;
  },
  async $queryRaw(_args: AnyArgs) {
    // Stub: callers in the codebase don't actually exercise this for baseDocument.
    return [];
  },
};

// ---------- presentation_themes ----------

const presentationThemes = {
  async create(args: AnyArgs) {
    const supabase = await getSupabase();
    const data = mapKeysToSnake({ ...(args?.data ?? {}) });
    if (!data.id) data.id = crypto.randomUUID();
    data.created_at = data.created_at ?? new Date().toISOString();
    data.updated_at = data.updated_at ?? new Date().toISOString();
    const { data: row, error } = await supabase
      .from("presentation_themes")
      .insert(data)
      .select("*")
      .single();
    if (error) throw error;
    return mapRowToCamel(row);
  },
  async findUnique(args: AnyArgs) {
    const supabase = await getSupabase();
    const where = args?.where ?? {};
    let q = supabase.from("presentation_themes").select("*");
    for (const [k, v] of Object.entries(where)) {
      if (v === undefined) continue;
      q = q.eq(toSnakeKey(k), v);
    }
    const { data, error } = await q.maybeSingle();
    if (error) throw error;
    if (!data) return null;
    let row = mapRowToCamel(data);
    if (args?.include) {
      row = (await loadIncludes("presentation_themes", [row], args.include, supabase))[0];
    }
    return row;
  },
  async update(args: AnyArgs) {
    const supabase = await getSupabase();
    const where = args?.where ?? {};
    const data = mapKeysToSnake({ ...(args?.data ?? {}) });
    if (data.updated_at === undefined) data.updated_at = new Date().toISOString();
    const { data: row, error } = await supabase
      .from("presentation_themes")
      .update(data)
      .match(mapKeysToSnake(where))
      .select("*")
      .single();
    if (error) throw error;
    return mapRowToCamel(row);
  },
  async delete(args: AnyArgs) {
    const supabase = await getSupabase();
    const where = args?.where ?? {};
    let q = supabase.from("presentation_themes").delete();
    for (const [k, v] of Object.entries(where)) {
      if (v === undefined) continue;
      q = q.eq(toSnakeKey(k), v);
    }
    const { data: rows, error } = await q.select("id");
    if (error) throw error;
    return { count: (rows ?? []).length };
  },
  async findMany(args: AnyArgs) {
    const supabase = await getSupabase();
    let q = supabase.from("presentation_themes").select("*");
    q = applyWhereToQuery(q, args?.where);
    q = applyOrder(q, args?.orderBy);
    if (typeof args?.take === "number") q = q.limit(args.take);
    if (typeof args?.skip === "number") {
      const off = args.skip;
      const lim = typeof args?.take === "number" ? args.take : 1000;
      q = q.range(off, off + lim - 1);
    }
    const { data, error } = await q;
    if (error) throw error;
    let rows = (data ?? []).map(mapRowToCamel);
    if (args?.include) {
      rows = await loadIncludes("presentation_themes", rows, args.include, supabase);
    }
    return rows;
  },
};

// ---------- presentation_theme_likes ----------

const presentationThemeLikes = {
  async findUnique(args: AnyArgs) {
    const supabase = await getSupabase();
    const where = args?.where ?? {};
    const composite = where.userId_themeId ?? where;
    let q = supabase.from("presentation_theme_likes").select("*");
    for (const [k, v] of Object.entries(composite)) {
      if (v === undefined) continue;
      q = q.eq(toSnakeKey(k), v);
    }
    const { data, error } = await q.maybeSingle();
    if (error) throw error;
    return data ? mapRowToCamel(data) : null;
  },
  async create(args: AnyArgs) {
    const supabase = await getSupabase();
    const data = mapKeysToSnake({ ...(args?.data ?? {}) });
    if (!data.id) data.id = crypto.randomUUID();
    data.created_at = data.created_at ?? new Date().toISOString();
    const { data: row, error } = await supabase
      .from("presentation_theme_likes")
      .insert(data)
      .select("*")
      .single();
    if (error) throw error;
    return mapRowToCamel(row);
  },
  async delete(args: AnyArgs) {
    const supabase = await getSupabase();
    const where = args?.where ?? {};
    const composite = where.userId_themeId ?? where;
    let q = supabase.from("presentation_theme_likes").delete();
    for (const [k, v] of Object.entries(composite)) {
      if (v === undefined) continue;
      q = q.eq(toSnakeKey(k), v);
    }
    const { data: rows, error } = await q.select("id");
    if (error) throw error;
    return { count: (rows ?? []).length };
  },
  async count(args: AnyArgs) {
    const supabase = await getSupabase();
    let q = supabase
      .from("presentation_theme_likes")
      .select("id", { count: "exact", head: true });
    q = applyWhereToQuery(q, args?.where);
    const { count, error } = await q;
    if (error) throw error;
    return count ?? 0;
  },
  async groupBy(args: AnyArgs) {
    const supabase = await getSupabase();
    let q = supabase.from("presentation_theme_likes").select("*");
    q = applyWhereToQuery(q, args?.where);
    const { data, error } = await q;
    if (error) throw error;
    const by = (args?.by ?? []) as string[];
    const counts = new Map<string, number>();
    for (const row of data ?? []) {
      const key = by.map((b) => mapRowToCamel(row)[b]).join("|");
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return Array.from(counts.entries()).map(([key, count]) => {
      const obj: any = {};
      by.forEach((b, i) => {
        obj[b] = key.split("|")[i];
      });
      obj._count = { id: count };
      return { ...obj, _count: { id: count } };
    });
  },
  async findMany(args: AnyArgs) {
    const supabase = await getSupabase();
    let q = supabase.from("presentation_theme_likes").select("*");
    q = applyWhereToQuery(q, args?.where);
    if (args?.select) {
      const cols = Object.keys(args.select)
        .filter((k) => args.select[k])
        .map(toSnakeKey)
        .join(",");
      if (cols) q = supabase.from("presentation_theme_likes").select(cols);
      q = applyWhereToQuery(q, args?.where);
    }
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []).map((r) => {
      const camel = mapRowToCamel(r);
      if (args?.select) return applySelect(camel, args.select);
      return camel;
    });
  },
};

// ---------- favorite_presentation_themes ----------

const favoritePresentationThemes = {
  async findUnique(args: AnyArgs) {
    const supabase = await getSupabase();
    const where = args?.where ?? {};
    const composite = where.userId_themeId ?? where;
    let q = supabase.from("favorite_presentation_themes").select("*");
    for (const [k, v] of Object.entries(composite)) {
      if (v === undefined) continue;
      q = q.eq(toSnakeKey(k), v);
    }
    const { data, error } = await q.maybeSingle();
    if (error) throw error;
    return data ? mapRowToCamel(data) : null;
  },
  async create(args: AnyArgs) {
    const supabase = await getSupabase();
    const data = mapKeysToSnake({ ...(args?.data ?? {}) });
    if (!data.id) data.id = crypto.randomUUID();
    data.created_at = data.created_at ?? new Date().toISOString();
    const { data: row, error } = await supabase
      .from("favorite_presentation_themes")
      .insert(data)
      .select("*")
      .single();
    if (error) throw error;
    return mapRowToCamel(row);
  },
  async delete(args: AnyArgs) {
    const supabase = await getSupabase();
    const where = args?.where ?? {};
    const composite = where.userId_themeId ?? where;
    let q = supabase.from("favorite_presentation_themes").delete();
    for (const [k, v] of Object.entries(composite)) {
      if (v === undefined) continue;
      q = q.eq(toSnakeKey(k), v);
    }
    const { data: rows, error } = await q.select("id");
    if (error) throw error;
    return { count: (rows ?? []).length };
  },
  async findMany(args: AnyArgs) {
    const supabase = await getSupabase();
    let q = supabase.from("favorite_presentation_themes").select("*");
    q = applyWhereToQuery(q, args?.where);
    q = applyOrder(q, args?.orderBy);
    const { data, error } = await q;
    if (error) throw error;
    let rows = (data ?? []).map(mapRowToCamel);
    if (args?.include) {
      rows = await loadIncludes("favorite_presentation_themes", rows, args.include, supabase);
    }
    if (args?.select) rows = rows.map((r) => applySelect(r, args.select));
    return rows;
  },
};

// ---------- font_pairs ----------

const fontPairs = {
  async create(args: AnyArgs) {
    const supabase = await getSupabase();
    const data = mapKeysToSnake({ ...(args?.data ?? {}) });
    if (!data.id) data.id = crypto.randomUUID();
    data.created_at = data.created_at ?? new Date().toISOString();
    data.updated_at = data.updated_at ?? new Date().toISOString();
    const { data: row, error } = await supabase
      .from("font_pairs")
      .insert(data)
      .select("*")
      .single();
    if (error) throw error;
    return mapRowToCamel(row);
  },
  async findUnique(args: AnyArgs) {
    const supabase = await getSupabase();
    const where = args?.where ?? {};
    let q = supabase.from("font_pairs").select("*");
    for (const [k, v] of Object.entries(where)) {
      if (v === undefined) continue;
      q = q.eq(toSnakeKey(k), v);
    }
    const { data, error } = await q.maybeSingle();
    if (error) throw error;
    return data ? mapRowToCamel(data) : null;
  },
  async findMany(args: AnyArgs) {
    const supabase = await getSupabase();
    let q = supabase.from("font_pairs").select("*");
    q = applyWhereToQuery(q, args?.where);
    q = applyOrder(q, args?.orderBy);
    if (typeof args?.take === "number") q = q.limit(args.take);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []).map(mapRowToCamel);
  },
  async delete(args: AnyArgs) {
    const supabase = await getSupabase();
    const where = args?.where ?? {};
    let q = supabase.from("font_pairs").delete();
    for (const [k, v] of Object.entries(where)) {
      if (v === undefined) continue;
      q = q.eq(toSnakeKey(k), v);
    }
    const { data: rows, error } = await q.select("id");
    if (error) throw error;
    return { count: (rows ?? []).length };
  },
};

async function executeRaw(_strings: TemplateStringsArray, ..._values: any[]) {
  // Not implemented for Supabase in this stub; callers use $executeRaw for
  // checkpoint tables which are managed separately.
  return 0;
}

export const db = {
  user: users,
  generatedImage: generatedImages,
  presentation: presentations,
  baseDocument: baseDocuments,
  presentationTheme: presentationThemes,
  presentationThemeLike: presentationThemeLikes,
  favoritePresentationTheme: favoritePresentationThemes,
  fontPair: fontPairs,
  $transaction: async (fn: any) => {
    if (Array.isArray(fn)) {
      return fn.map((f) => (typeof f === "function" ? f() : f));
    }
    return fn();
  },
  $executeRaw: executeRaw,
};