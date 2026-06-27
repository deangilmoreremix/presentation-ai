import { createAdminClient } from "@/lib/supabase/admin";

type AnyClient = ReturnType<typeof createAdminClient>;
type SB = AnyClient;
type FromResult = ReturnType<SB["from"]>;

function sb(): SB {
  return createAdminClient();
}

interface WhereClause {
  [k: string]: unknown;
}

interface OrderByClause {
  [k: string]: "asc" | "desc";
}

interface CreateArgs<TData = unknown> {
  data: TData;
  include?: Record<string, unknown>;
}

interface FindUniqueArgs {
  where: WhereClause;
  include?: Record<string, unknown>;
  select?: Record<string, boolean>;
}

interface FindFirstArgs {
  where?: WhereClause;
  include?: Record<string, unknown>;
  select?: Record<string, boolean>;
  orderBy?: OrderByClause;
}

interface FindManyArgs {
  where?: WhereClause;
  orderBy?: OrderByClause;
  take?: number;
  skip?: number;
  include?: Record<string, unknown>;
  select?: Record<string, boolean>;
}

interface UpdateArgs<TData = unknown> {
  where: WhereClause;
  data: TData;
  include?: Record<string, unknown>;
}

interface DeleteArgs {
  where: WhereClause;
}

interface CountArgs {
  where?: WhereClause;
}

interface GroupByArgs {
  by: string[];
  where?: WhereClause;
  _count?: Record<string, boolean>;
}

interface UserRef {
  id: string;
  name?: string | null;
  image?: string | null;
}

interface GeneratedImageRow {
  id: string;
  url: string;
  userId: string;
  prompt: string;
  model?: string | null;
  size?: string | null;
  quality?: string | null;
  format?: string | null;
  compression?: number | null;
  background?: string | null;
  action?: string | null;
  previousResponseId?: string | null;
  n?: number | null;
  inputImages?: string[];
  createdAt?: string;
  updatedAt?: string;
}

interface PresentationRow {
  id: string;
  content?: unknown;
  theme?: string;
  imageSource?: string | null;
  prompt?: string | null;
  presentationStyle?: string | null;
  customization?: unknown;
  language?: string | null;
  outline?: string[];
  searchResults?: unknown;
  templateId?: string | null;
}

interface FavoriteRef {
  id: string;
}

interface BaseDocumentRow {
  id: string;
  title?: string;
  type?: string;
  userId?: string;
  thumbnailUrl?: string | null;
  isPublic?: boolean;
  documentType?: string;
  createdAt?: string;
  updatedAt?: string;
  presentation?: PresentationRow | null;
  favorites?: FavoriteRef[];
  user?: UserRef | null;
}

interface CustomThemeRow {
  id: string;
  name: string;
  description?: string | null;
  userId: string;
  logoUrl?: string | null;
  isPublic?: boolean;
  isAdmin?: boolean;
  themeData?: unknown;
  createdAt?: string;
  updatedAt?: string;
  user?: { name?: string | null } | null;
  _count?: { presentationThemeLikes: number };
  presentationThemeLikes?: { id: string }[];
  favoritePresentationThemes?: { id: string }[];
}

interface PresentationThemeLikeRow {
  id: string;
  userId: string;
  themeId: string;
  createdAt?: string;
}

interface FavoritePresentationThemeRow {
  id: string;
  userId: string;
  themeId: string;
  createdAt?: string;
  theme?: CustomThemeRow | null;
}

interface FontPairRow {
  id: string;
  heading: string;
  headingUrl?: string | null;
  headingWeight?: number;
  body: string;
  bodyUrl?: string | null;
  bodyWeight?: number;
  userId: string;
  createdAt?: string;
  updatedAt?: string;
}

interface UserRow {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

interface UpdateManyResult {
  count: number;
}

function throwIfError(error: { message: string } | null, ctx: string): void {
  if (error) throw new Error(`[db:${ctx}] ${error.message}`);
}

function applyOrder(q: FromResult, orderBy?: OrderByClause): FromResult {
  if (!orderBy) return q;
  let out: FromResult = q;
  for (const [col, dir] of Object.entries(orderBy)) {
    out = out.order(col, { ascending: dir === "asc" }) as FromResult;
  }
  return out;
}

function applyWhere(q: FromResult, where: WhereClause | undefined): FromResult {
  if (!where) return q;
  let out: FromResult = q;
  for (const [rawKey, rawVal] of Object.entries(where)) {
    if (rawKey === "OR" || rawKey === "AND") continue;
    if (rawVal && typeof rawVal === "object" && !Array.isArray(rawVal)) {
      const op = rawVal as { in?: unknown[]; notIn?: unknown[]; contains?: unknown; not?: unknown };
      if (op.in !== undefined) {
        out = out.in(rawKey, op.in as readonly unknown[]) as FromResult;
        continue;
      }
      if (op.notIn !== undefined) {
        out = out.not("in", rawKey, op.notIn as readonly unknown[]) as FromResult;
        continue;
      }
      if (op.contains !== undefined) {
        out = out.contains(rawKey, String(op.contains)) as FromResult;
        continue;
      }
      if (op.not !== undefined) {
        out = out.neq(rawKey, op.not) as FromResult;
        continue;
      }
    }
    out = out.eq(rawKey, rawVal as never) as FromResult;
  }
  return out;
}

function uniqueId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

async function loadPresentation(id: string): Promise<PresentationRow | null> {
  const supabase = sb();
  const { data, error } = await supabase.from("Presentation" as never).select("*").eq("id", id).maybeSingle();
  throwIfError(error, "Presentation.findUnique");
  return (data as PresentationRow | null) ?? null;
}

async function attachPresentationToBase<T extends BaseDocumentRow>(row: T, include: Record<string, unknown> | undefined): Promise<T> {
  if (!include?.presentation) {
    return { ...row, presentation: null };
  }
  const pres = await loadPresentation(row.id);
  return { ...row, presentation: pres };
}

async function attachPresentationList<T extends BaseDocumentRow>(rows: T[], include: Record<string, unknown> | undefined): Promise<T[]> {
  if (!include?.presentation) return rows;
  return Promise.all(rows.map((r) => attachPresentationToBase(r, include)));
}

async function attachUserToBase<T extends BaseDocumentRow>(row: T, sel: unknown): Promise<T> {
  const selSpec = (sel as { select?: { name?: boolean; image?: boolean } } | undefined) ?? {};
  if (!row.userId) return row;
  const supabase = sb();
  const colsNeeded: string[] = [];
  if (selSpec.select?.name) colsNeeded.push("name");
  if (selSpec.select?.image) colsNeeded.push("image");
  const cols = ["id", ...colsNeeded].join(",");
  const { data } = await supabase.from("User" as never).select(cols || "id").eq("id", row.userId).maybeSingle();
  return { ...row, user: (data as UserRef | null) ?? null };
}

async function attachUserList<T extends BaseDocumentRow>(rows: T[], sel: unknown): Promise<T[]> {
  return Promise.all(rows.map((r) => attachUserToBase(r, sel)));
}

async function attachFavoritesToBase<T extends BaseDocumentRow>(row: T, favSpec: unknown): Promise<T> {
  const spec = (favSpec as { where?: WhereClause } | undefined) ?? {};
  const supabase = sb();
  let q: FromResult = supabase.from("FavoriteDocument" as never).select("id").eq("documentId", row.id);
  if (spec.where) q = applyWhere(q, spec.where);
  const { data } = await q;
  return { ...row, favorites: (data as FavoriteRef[] | null) ?? [] };
}

async function attachFavoritesList<T extends BaseDocumentRow>(rows: T[], favSpec: unknown): Promise<T[]> {
  return Promise.all(rows.map((r) => attachFavoritesToBase(r, favSpec)));
}

async function attachThemeRelations<T extends CustomThemeRow>(row: T, include: Record<string, unknown> | undefined): Promise<T> {
  const result: T = { ...row };
  const supabase = sb();
  const inc = include ?? {};

  if (inc.user) {
    if (row.userId !== undefined) {
      const userSel = (inc.user as { select?: Record<string, boolean> }).select ?? { name: true };
      const cols = ["id", ...Object.keys(userSel).filter((k) => userSel[k])].join(",");
      const { data } = await supabase.from("User" as never).select(cols || "id").eq("id", row.userId).maybeSingle();
      (result as CustomThemeRow).user = (data as { name?: string | null } | null) ?? null;
    }
  }
  if (inc._count) {
    const { count } = await supabase.from("PresentationThemeLike" as never).select("id", { count: "exact", head: true }).eq("themeId", row.id);
    (result as CustomThemeRow)._count = { presentationThemeLikes: count ?? 0 };
  }
  const likesSub = inc.presentationThemeLikes as { where?: WhereClause; select?: Record<string, boolean> } | undefined;
  if (likesSub) {
    let q: FromResult = supabase.from("PresentationThemeLike" as never).select("id").eq("themeId", row.id);
    if (likesSub.where) q = applyWhere(q, likesSub.where);
    const { data } = await q;
    (result as CustomThemeRow).presentationThemeLikes = (data as { id: string }[] | null) ?? [];
  }
  const favSub = inc.favoritePresentationThemes as { where?: WhereClause; select?: Record<string, boolean> } | undefined;
  if (favSub) {
    let q: FromResult = supabase.from("FavoritePresentationTheme" as never).select("id").eq("themeId", row.id);
    if (favSub.where) q = applyWhere(q, favSub.where);
    const { data } = await q;
    (result as CustomThemeRow).favoritePresentationThemes = (data as { id: string }[] | null) ?? [];
  }
  return result;
}

async function attachFavoriteThemeRow<T extends FavoritePresentationThemeRow>(row: T, include: Record<string, unknown> | undefined): Promise<T> {
  if (!include?.theme) return row;
  const supabase = sb();
  const { data: themeRow } = await supabase.from("CustomTheme" as never).select("*").eq("id", row.themeId).maybeSingle();
  if (!themeRow) return { ...row, theme: null };
  const enriched = await attachThemeRelations(themeRow as CustomThemeRow, (include.theme as { include?: Record<string, unknown> }).include);
  return { ...row, theme: enriched };
}

async function attachFavoriteThemeList<T extends FavoritePresentationThemeRow>(rows: T[], include: Record<string, unknown> | undefined): Promise<T[]> {
  if (!include?.theme) return rows;
  return Promise.all(rows.map((r) => attachFavoriteThemeRow(r, include)));
}

function applyOr(q: FromResult, where: WhereClause | undefined): FromResult {
  if (!where) return q;
  const orList = where.OR as Array<WhereClause> | undefined;
  if (!orList || !Array.isArray(orList)) return q;
  const parts: string[] = [];
  for (const cond of orList) {
    for (const [k, v] of Object.entries(cond)) {
      parts.push(`${k}.eq.${typeof v === "string" ? `"${v}"` : String(v)}`);
    }
  }
  if (parts.length) return q.or(parts.join(",")) as FromResult;
  return q;
}

export const db = {
  generatedImage: {
    async create({ data }: CreateArgs<Record<string, unknown>>): Promise<GeneratedImageRow> {
      const supabase = sb();
      const row: Record<string, unknown> = { id: uniqueId(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...data };
      const { data: created, error } = await (supabase.from("GeneratedImage" as never) as unknown as { insert: (v: unknown) => { select: () => { single: () => Promise<{ data: unknown; error: { message: string } | null }> } } }).insert(row).select().single();
      throwIfError(error, "generatedImage.create");
      return created as unknown as GeneratedImageRow;
    },
    async findMany({ where, orderBy, take, skip }: FindManyArgs): Promise<GeneratedImageRow[]> {
      const supabase = sb();
      let q: FromResult = supabase.from("GeneratedImage" as never).select("*");
      q = applyWhere(q, where);
      q = applyOrder(q, orderBy);
      if (typeof skip === "number" && typeof take === "number") {
        q = q.range(skip, skip + take - 1) as FromResult;
      } else if (typeof take === "number") {
        q = q.limit(take) as FromResult;
      }
      const { data, error } = await q;
      throwIfError(error, "generatedImage.findMany");
      return (data as GeneratedImageRow[] | null) ?? [];
    },
  },

  baseDocument: {
    async create({ data, include }: CreateArgs<Record<string, unknown>>): Promise<BaseDocumentRow> {
      const supabase = sb();
      const now = new Date().toISOString();
      const row: Record<string, unknown> = { id: uniqueId(), createdAt: now, updatedAt: now, isPublic: false, ...data };
      const presNested = row.presentation as { create?: Record<string, unknown> } | undefined;
      delete row.presentation;
      const { data: created, error } = await supabase.from("BaseDocument" as never).insert(row as never).select().single();
      throwIfError(error, "baseDocument.create");
      const baseRow = created as unknown as BaseDocumentRow;
      if (presNested?.create) {
        const presData: Record<string, unknown> = { id: baseRow.id, ...presNested.create };
        const { data: p, error: pe } = await supabase.from("Presentation" as never).insert(presData as never).select().single();
        throwIfError(pe, "baseDocument.create.presentation");
        if (include?.presentation) {
          return { ...baseRow, presentation: (p as PresentationRow | null) ?? null };
        }
      }
      return { ...baseRow, presentation: null };
    },
    async findUnique({ where, include, select }: FindUniqueArgs): Promise<BaseDocumentRow | null> {
      const supabase = sb();
      const cols = select
        ? Object.keys(select).filter((k) => select[k]).join(",") || "*"
        : "*";
      let q: FromResult = supabase.from("BaseDocument" as never).select(cols);
      q = applyWhere(q, where);
      const { data, error } = await q.maybeSingle();
      throwIfError(error, "baseDocument.findUnique");
      const row = (data as BaseDocumentRow | null) ?? null;
      if (!row) return null;
      let result: BaseDocumentRow = { ...row, presentation: null, favorites: [], user: null };
      if (include?.presentation) result = await attachPresentationToBase(result, include);
      if (include?.favorites) result = await attachFavoritesToBase(result, include.favorites);
      if (include?.user) result = await attachUserToBase(result, include.user);
      return result;
    },
    async findFirst({ where, include, select, orderBy }: FindFirstArgs): Promise<BaseDocumentRow | null> {
      const supabase = sb();
      const cols = select
        ? Object.keys(select).filter((k) => select[k]).join(",") || "*"
        : "*";
      let q: FromResult = supabase.from("BaseDocument" as never).select(cols);
      q = applyWhere(q, where);
      q = applyOrder(q, orderBy);
      q = q.limit(1) as FromResult;
      const { data, error } = await q.maybeSingle();
      throwIfError(error, "baseDocument.findFirst");
      const row = (data as BaseDocumentRow | null) ?? null;
      if (!row) return null;
      return { ...row, presentation: null, favorites: [], user: null };
    },
    async findMany({ where, orderBy, take, skip, include, select }: FindManyArgs): Promise<BaseDocumentRow[]> {
      const supabase = sb();
      const cols = select
        ? Object.keys(select).filter((k) => select[k]).join(",") || "*"
        : "*";
      let q: FromResult = supabase.from("BaseDocument" as never).select(cols);
      q = applyWhere(q, where);
      q = applyOr(q, where);
      q = applyOrder(q, orderBy);
      if (typeof skip === "number" && typeof take === "number") {
        q = q.range(skip, skip + take - 1) as FromResult;
      } else if (typeof take === "number") {
        q = q.limit(take) as FromResult;
      }
      const { data, error } = await q;
      throwIfError(error, "baseDocument.findMany");
      const rows = ((data as BaseDocumentRow[] | null) ?? []) as BaseDocumentRow[];
      const withDefaults: BaseDocumentRow[] = rows.map((r) => ({ ...r, presentation: null, favorites: [], user: null }));
      if (!include) return withDefaults;
      let out = withDefaults;
      out = await attachPresentationList(out, include);
      out = await attachUserList(out, include.user);
      out = await attachFavoritesList(out, include.favorites);
      return out;
    },
    async update({ where, data, include }: UpdateArgs<Record<string, unknown>>): Promise<BaseDocumentRow> {
      const supabase = sb();
      const presNested = data.presentation as { update?: Record<string, unknown> } | undefined;
      const docUpdate: Record<string, unknown> = { ...data, updatedAt: new Date().toISOString() };
      delete docUpdate.presentation;
      let q: FromResult = supabase.from("BaseDocument" as never).update(docUpdate as never);
      q = applyWhere(q, where);
      const { data: updated, error } = await q.select().single();
      throwIfError(error, "baseDocument.update");
      const baseRow = (updated as BaseDocumentRow | null) ?? ({} as BaseDocumentRow);
      let withPres: BaseDocumentRow = { ...baseRow, presentation: null, favorites: [], user: null };
      if (presNested?.update && baseRow.id) {
        let pu: FromResult = supabase.from("Presentation" as never).update(presNested.update as never).eq("id", baseRow.id);
        const { data: p, error: pe } = await pu.select().single();
        if (!pe && p && include?.presentation) {
          withPres = { ...withPres, presentation: (p as PresentationRow | null) ?? null };
        }
      }
      return withPres;
    },
    async updateMany({ where, data }: UpdateArgs<Record<string, unknown>>): Promise<UpdateManyResult> {
      const supabase = sb();
      let q: FromResult = supabase.from("BaseDocument" as never).update(data as never, { count: "exact" });
      q = applyWhere(q, where);
      const { count, error } = await q;
      throwIfError(error, "baseDocument.updateMany");
      return { count: count ?? 0 };
    },
    async deleteMany({ where }: DeleteArgs): Promise<UpdateManyResult> {
      const supabase = sb();
      let q: FromResult = supabase.from("BaseDocument" as never).delete({ count: "exact" });
      q = applyWhere(q, where);
      const { count, error } = await q;
      throwIfError(error, "baseDocument.deleteMany");
      return { count: count ?? 0 };
    },
    async count({ where }: CountArgs): Promise<number> {
      const supabase = sb();
      let q: FromResult = supabase.from("BaseDocument" as never).select("id", { count: "exact", head: true });
      q = applyWhere(q, where);
      const { count, error } = await q;
      throwIfError(error, "baseDocument.count");
      return count ?? 0;
    },
  },

  presentation: {
    async findUnique({ where, select }: FindUniqueArgs): Promise<PresentationRow | null> {
      const supabase = sb();
      const cols = select
        ? Object.keys(select).filter((k) => select[k]).join(",") || "*"
        : "*";
      let q: FromResult = supabase.from("Presentation" as never).select(cols);
      q = applyWhere(q, where);
      const { data, error } = await q.maybeSingle();
      throwIfError(error, "presentation.findUnique");
      return (data as PresentationRow | null) ?? null;
    },
  },

  presentationTheme: {
    async create({ data }: CreateArgs<Record<string, unknown>>): Promise<CustomThemeRow> {
      const supabase = sb();
      const now = new Date().toISOString();
      const row: Record<string, unknown> = { id: uniqueId(), createdAt: now, updatedAt: now, isAdmin: false, ...data };
      const { data: created, error } = await supabase.from("CustomTheme" as never).insert(row as never).select().single();
      throwIfError(error, "presentationTheme.create");
      return created as unknown as CustomThemeRow;
    },
    async findUnique({ where, include }: FindUniqueArgs): Promise<CustomThemeRow | null> {
      const supabase = sb();
      let q: FromResult = supabase.from("CustomTheme" as never).select("*");
      q = applyWhere(q, where);
      const { data, error } = await q.maybeSingle();
      throwIfError(error, "presentationTheme.findUnique");
      const row = (data as CustomThemeRow | null) ?? null;
      if (!row) return null;
      if (include) return attachThemeRelations(row, include);
      return row;
    },
    async update({ where, data }: UpdateArgs<Record<string, unknown>>): Promise<CustomThemeRow> {
      const supabase = sb();
      const upd: Record<string, unknown> = { ...data, updatedAt: new Date().toISOString() };
      let q: FromResult = supabase.from("CustomTheme" as never).update(upd as never);
      q = applyWhere(q, where);
      const { data: updated, error } = await q.select().single();
      throwIfError(error, "presentationTheme.update");
      return updated as unknown as CustomThemeRow;
    },
    async delete({ where }: DeleteArgs): Promise<CustomThemeRow | null> {
      const supabase = sb();
      let q: FromResult = supabase.from("CustomTheme" as never).delete();
      q = applyWhere(q, where);
      const { error } = await q;
      throwIfError(error, "presentationTheme.delete");
      return null;
    },
    async findMany({ where, orderBy, include }: FindManyArgs): Promise<CustomThemeRow[]> {
      const supabase = sb();
      let q: FromResult = supabase.from("CustomTheme" as never).select("*");
      q = applyWhere(q, where);
      q = applyOrder(q, orderBy);
      const { data, error } = await q;
      throwIfError(error, "presentationTheme.findMany");
      const rows = ((data as CustomThemeRow[] | null) ?? []) as CustomThemeRow[];
      if (!include) return rows;
      return Promise.all(rows.map((r) => attachThemeRelations(r, include)));
    },
  },

  presentationThemeLike: {
    async findUnique({ where }: FindUniqueArgs): Promise<PresentationThemeLikeRow | null> {
      const supabase = sb();
      const filter = (where.userId_themeId as WhereClause | undefined) ?? where;
      let q: FromResult = supabase.from("PresentationThemeLike" as never).select("*");
      for (const [k, v] of Object.entries(filter)) q = q.eq(k, v as never) as FromResult;
      const { data, error } = await q.maybeSingle();
      throwIfError(error, "presentationThemeLike.findUnique");
      return (data as PresentationThemeLikeRow | null) ?? null;
    },
    async delete({ where }: DeleteArgs): Promise<PresentationThemeLikeRow | null> {
      const supabase = sb();
      const filter = (where.userId_themeId as WhereClause | undefined) ?? where;
      let q: FromResult = supabase.from("PresentationThemeLike" as never).delete();
      for (const [k, v] of Object.entries(filter)) q = q.eq(k, v as never) as FromResult;
      const { error } = await q;
      throwIfError(error, "presentationThemeLike.delete");
      return null;
    },
    async create({ data }: CreateArgs<Record<string, unknown>>): Promise<PresentationThemeLikeRow> {
      const supabase = sb();
      const row: Record<string, unknown> = { id: uniqueId(), createdAt: new Date().toISOString(), ...data };
      const { data: created, error } = await supabase.from("PresentationThemeLike" as never).insert(row as never).select().single();
      throwIfError(error, "presentationThemeLike.create");
      return created as unknown as PresentationThemeLikeRow;
    },
    async count({ where }: CountArgs): Promise<number> {
      const supabase = sb();
      let q: FromResult = supabase.from("PresentationThemeLike" as never).select("id", { count: "exact", head: true });
      q = applyWhere(q, where);
      const { count, error } = await q;
      throwIfError(error, "presentationThemeLike.count");
      return count ?? 0;
    },
    async groupBy({ by, where, _count }: GroupByArgs): Promise<Array<{ themeId: string; _count: { id: number } }>> {
      const supabase = sb();
      const groupCol = by[0] ?? "id";
      let q: FromResult = supabase.from("PresentationThemeLike" as never).select(groupCol);
      q = applyWhere(q, where);
      const { data, error } = await q;
      throwIfError(error, "presentationThemeLike.groupBy");
      const groups: Record<string, number> = {};
      for (const row of ((data as Record<string, unknown>[] | null) ?? []) as Record<string, unknown>[]) {
        const key = String(row[groupCol]);
        groups[key] = (groups[key] ?? 0) + 1;
      }
      const _countKey = _count ? Object.keys(_count)[0] ?? "id" : "id";
      return Object.entries(groups).map(([k, v]) => ({ themeId: k, _count: { id: v } }));
    },
    async findMany({ where, select }: FindManyArgs): Promise<PresentationThemeLikeRow[]> {
      const supabase = sb();
      const cols = select
        ? Object.keys(select).filter((k) => select[k]).join(",") || "*"
        : "*";
      let q: FromResult = supabase.from("PresentationThemeLike" as never).select(cols);
      q = applyWhere(q, where);
      const { data, error } = await q;
      throwIfError(error, "presentationThemeLike.findMany");
      return (data as PresentationThemeLikeRow[] | null) ?? [];
    },
  },

  favoritePresentationTheme: {
    async findUnique({ where }: FindUniqueArgs): Promise<FavoritePresentationThemeRow | null> {
      const supabase = sb();
      const filter = (where.userId_themeId as WhereClause | undefined) ?? where;
      let q: FromResult = supabase.from("FavoritePresentationTheme" as never).select("*");
      for (const [k, v] of Object.entries(filter)) q = q.eq(k, v as never) as FromResult;
      const { data, error } = await q.maybeSingle();
      throwIfError(error, "favoritePresentationTheme.findUnique");
      return (data as FavoritePresentationThemeRow | null) ?? null;
    },
    async delete({ where }: DeleteArgs): Promise<FavoritePresentationThemeRow | null> {
      const supabase = sb();
      const filter = (where.userId_themeId as WhereClause | undefined) ?? where;
      let q: FromResult = supabase.from("FavoritePresentationTheme" as never).delete();
      for (const [k, v] of Object.entries(filter)) q = q.eq(k, v as never) as FromResult;
      const { error } = await q;
      throwIfError(error, "favoritePresentationTheme.delete");
      return null;
    },
    async create({ data }: CreateArgs<Record<string, unknown>>): Promise<FavoritePresentationThemeRow> {
      const supabase = sb();
      const row: Record<string, unknown> = { id: uniqueId(), createdAt: new Date().toISOString(), ...data };
      const { data: created, error } = await supabase.from("FavoritePresentationTheme" as never).insert(row as never).select().single();
      throwIfError(error, "favoritePresentationTheme.create");
      return created as unknown as FavoritePresentationThemeRow;
    },
    async findMany({ where, orderBy, include }: FindManyArgs): Promise<FavoritePresentationThemeRow[]> {
      const supabase = sb();
      let q: FromResult = supabase.from("FavoritePresentationTheme" as never).select("*");
      q = applyWhere(q, where);
      q = applyOrder(q, orderBy);
      const { data, error } = await q;
      throwIfError(error, "favoritePresentationTheme.findMany");
      const rows = ((data as FavoritePresentationThemeRow[] | null) ?? []) as FavoritePresentationThemeRow[];
      return attachFavoriteThemeList(rows, include);
    },
  },

  fontPair: {
    async create({ data }: CreateArgs<Record<string, unknown>>): Promise<FontPairRow> {
      const supabase = sb();
      const now = new Date().toISOString();
      const row: Record<string, unknown> = { id: uniqueId(), createdAt: now, updatedAt: now, headingWeight: 700, bodyWeight: 400, ...data };
      const { data: created, error } = await supabase.from("FontPair" as never).insert(row as never).select().single();
      throwIfError(error, "fontPair.create");
      return created as unknown as FontPairRow;
    },
    async findMany({ where, orderBy }: FindManyArgs): Promise<FontPairRow[]> {
      const supabase = sb();
      let q: FromResult = supabase.from("FontPair" as never).select("*");
      q = applyWhere(q, where);
      q = applyOrder(q, orderBy);
      const { data, error } = await q;
      throwIfError(error, "fontPair.findMany");
      return (data as FontPairRow[] | null) ?? [];
    },
    async findUnique({ where }: FindUniqueArgs): Promise<FontPairRow | null> {
      const supabase = sb();
      let q: FromResult = supabase.from("FontPair" as never).select("*");
      q = applyWhere(q, where);
      const { data, error } = await q.maybeSingle();
      throwIfError(error, "fontPair.findUnique");
      return (data as FontPairRow | null) ?? null;
    },
    async delete({ where }: DeleteArgs): Promise<FontPairRow | null> {
      const supabase = sb();
      let q: FromResult = supabase.from("FontPair" as never).delete();
      q = applyWhere(q, where);
      const { error } = await q;
      throwIfError(error, "fontPair.delete");
      return null;
    },
  },

  user: {
    async findUnique({ where }: FindUniqueArgs): Promise<UserRow | null> {
      const supabase = sb();
      let q: FromResult = supabase.from("User" as never).select("*");
      q = applyWhere(q, where);
      const { data, error } = await q.maybeSingle();
      throwIfError(error, "user.findUnique");
      return (data as UserRow | null) ?? null;
    },
    async upsert(args: { where: WhereClause; create: Record<string, unknown>; update: Record<string, unknown> }): Promise<UserRow> {
      const supabase = sb();
      let q: FromResult = supabase.from("User" as never).select("*");
      q = applyWhere(q, args.where);
      const { data: existing } = await q.maybeSingle();
      if (existing) {
        let uq: FromResult = supabase.from("User" as never).update(args.update as never);
        uq = applyWhere(uq, args.where);
        const { data, error } = await uq.select().single();
        throwIfError(error, "user.upsert.update");
        return data as unknown as UserRow;
      }
      const row: Record<string, unknown> = { id: uniqueId(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...args.create };
      const { data, error } = await supabase.from("User" as never).insert(row as never).select().single();
      throwIfError(error, "user.upsert.create");
      return data as unknown as UserRow;
    },
  },

  async $transaction(ops: Array<Promise<unknown> | (() => Promise<unknown>)>): Promise<unknown[]> {
    const results: unknown[] = [];
    for (const op of ops) {
      const r = await (typeof op === "function" ? (op as () => Promise<unknown>)() : op);
      results.push(r);
    }
    return results;
  },

  async $executeRaw(_strings: TemplateStringsArray, ..._values: unknown[]): Promise<number> {
    console.warn("[db.$executeRaw] no-op: raw SQL execution not supported via PostgREST facade");
    return 0;
  },
};