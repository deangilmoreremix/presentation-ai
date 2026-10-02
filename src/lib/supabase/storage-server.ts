import "server-only";

import { appLogger } from "@/lib/observability/logger";
import { getUserAssetPublicUrl } from "@/lib/supabase/storage-url";
import { createClient, getClerkUserId } from "@/lib/supabase/server";

/**
 * Server-side asset storage.
 *
 * The buckets created by `supabase/migrations/011_user_asset_storage.sql` gate
 * `storage.objects` on `auth.uid()::text = (storage.foldername(name))[2]`.
 * This app authenticates with Clerk only and never establishes a Supabase Auth
 * session, so `auth.uid()` is always `null` for browser uploads and every
 * insert was rejected by those policies.
 *
 * Uploads therefore run on the server, resolving the user id from the trusted
 * Clerk session and writing through the service-role client (RLS bypassed).
 * The object layout (`users/{userId}/{prefix}/{uuid}.{ext}`) is unchanged, so
 * already-stored objects and existing public URLs stay valid.
 *
 * Every value that influences the destination path is validated here. The
 * client cannot choose which user's folder to write into, nor the filename.
 */

export type AssetBucket = "user-assets" | "presentation-images";

export type UploadedAsset = {
  path: string;
  publicUrl: string;
};

export class AssetRequestError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "AssetRequestError";
    this.status = status;
  }
}

type BucketRule = {
  /** Allowlisted folder names directly under `users/{userId}/`. */
  prefixes: readonly string[];
  maxBytes: number;
  /**
   * Canonical MIME type -> canonical extension. Both directions come from this
   * map, so the extension written to storage is server-owned.
   */
  contentTypes: Readonly<Record<string, string>>;
};

const BUCKET_RULES: Readonly<Record<AssetBucket, BucketRule>> = {
  "presentation-images": {
    prefixes: ["slides", "images", "backgrounds", "thumbnails", "files"],
    maxBytes: 10 * 1024 * 1024,
    contentTypes: {
      "image/png": "png",
      "image/jpeg": "jpg",
      "image/jpg": "jpg",
      "image/webp": "webp",
      "image/gif": "gif",
      "image/avif": "avif",
    },
  },
  "user-assets": {
    prefixes: ["fonts", "files", "attachments", "images"],
    maxBytes: 2 * 1024 * 1024,
    contentTypes: {
      "font/woff": "woff",
      "font/woff2": "woff2",
      "font/ttf": "ttf",
      "font/otf": "otf",
      "application/font-woff": "woff",
      "application/font-woff2": "woff2",
      "application/x-font-woff": "woff",
      "application/x-font-woff2": "woff2",
      "application/x-font-ttf": "ttf",
      "application/x-font-opentype": "otf",
      "application/vnd.ms-fontobject": "eot",
    },
  },
};

/** Browsers report no usable MIME type for some font files. */
const OPAQUE_CONTENT_TYPES = new Set([
  "",
  "application/octet-stream",
  "binary/octet-stream",
]);

/** Lowercased, trimmed MIME type without parameters (`; charset=...`). */
function normalizeContentType(raw: string | undefined | null): string {
  return (raw ?? "").split(";")[0]?.trim().toLowerCase() ?? "";
}

/**
 * Reads the extension off a client-supplied filename purely as a lookup key
 * into the bucket allowlist. It is never written to storage verbatim, and
 * separators that could escape the intended folder are rejected outright.
 */
function extensionFromFileName(
  fileName: string | null | undefined,
): string | null {
  if (!fileName || fileName.includes("/") || fileName.includes("\\")) {
    return null;
  }
  return /\.([A-Za-z0-9]{1,10})$/.exec(fileName)?.[1]?.toLowerCase() ?? null;
}

/** Canonical MIME type for an allowlisted extension, or `null` if unknown. */
function contentTypeForExtension(
  rule: BucketRule,
  extension: string,
): string | null {
  for (const [contentType, ext] of Object.entries(rule.contentTypes)) {
    if (ext === extension) return contentType;
  }
  return null;
}

/**
 * Maps a client-declared MIME type onto a server-owned (extension, MIME type)
 * pair. The declared type is authoritative when it is on the allowlist; the
 * filename extension is consulted only for the opaque content types browsers
 * send for some font files, and even then only as a lookup key.
 */
function resolveContentType(
  rule: BucketRule,
  declaredType: string,
  fileName: string | undefined,
): { extension: string; contentType: string } {
  const fromDeclared = rule.contentTypes[declaredType];
  if (fromDeclared !== undefined) {
    return { extension: fromDeclared, contentType: declaredType };
  }

  if (!OPAQUE_CONTENT_TYPES.has(declaredType)) {
    throw new AssetRequestError(`Unsupported content type: ${declaredType}`);
  }

  const guessed = extensionFromFileName(fileName);
  const resolvedType = guessed ? contentTypeForExtension(rule, guessed) : null;
  if (!guessed || !resolvedType) {
    throw new AssetRequestError(`Unsupported file type: ${fileName ?? "unknown"}`);
  }

  return { extension: guessed, contentType: resolvedType };
}

function resolveBucket(bucket: unknown): AssetBucket {
  // `in` alone would also match inherited keys such as "toString".
  if (
    typeof bucket !== "string" ||
    !Object.hasOwn(BUCKET_RULES, bucket)
  ) {
    throw new AssetRequestError(`Unsupported bucket: ${String(bucket)}`);
  }
  return bucket as AssetBucket;
}

function resolvePrefix(rule: BucketRule, prefix: unknown): string {
  const requested = prefix === null || prefix === undefined ? "files" : prefix;
  if (typeof requested !== "string" || !rule.prefixes.includes(requested)) {
    throw new AssetRequestError(`Unsupported path prefix: ${String(requested)}`);
  }
  return requested;
}

export async function uploadAsset(
  formData: FormData,
): Promise<UploadedAsset> {
  const file = formData.get("file");
  if (!(file instanceof File)) {
    throw new AssetRequestError("No file provided");
  }

  const bucket = resolveBucket(formData.get("bucket"));
  const rule = BUCKET_RULES[bucket];
  const prefix = resolvePrefix(rule, formData.get("prefix"));

  if (file.size <= 0) {
    throw new AssetRequestError("File is empty");
  }
  if (file.size > rule.maxBytes) {
    throw new AssetRequestError(
      `File is too large (max ${Math.floor(rule.maxBytes / (1024 * 1024))}MB)`,
    );
  }

  const { extension, contentType } = resolveContentType(
    rule,
    normalizeContentType(file.type),
    file.name,
  );

  // Trusted identity, resolved from the Clerk session on the server and never
  // from the request body.
  const userId = await getClerkUserId();

  const supabase = await createClient();
  if (!supabase) {
    throw new AssetRequestError("Supabase is not configured", 500);
  }

  const path = `users/${userId}/${prefix}/${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType,
    upsert: false,
  });

  if (error) {
    appLogger.error("Asset upload failed", { bucket, path, error });
    throw new AssetRequestError("Failed to upload file", 500);
  }

  return { path, publicUrl: getUserAssetPublicUrl({ bucket, path }) };
}

export async function deleteAsset(input: {
  bucket: unknown;
  path: unknown;
}): Promise<void> {
  const bucket = resolveBucket(input?.bucket);

  if (typeof input.path !== "string" || input.path.length === 0) {
    throw new AssetRequestError("No path provided");
  }

  const userId = await getClerkUserId();

  // Ownership check: the service-role client bypasses RLS, so the path is
  // validated against the caller's own folder explicitly.
  if (!input.path.startsWith(`users/${userId}/`)) {
    throw new AssetRequestError("Path does not belong to the current user", 403);
  }

  const supabase = await createClient();
  if (!supabase) {
    throw new AssetRequestError("Supabase is not configured", 500);
  }

  const { error } = await supabase.storage.from(bucket).remove([input.path]);
  if (error) {
    appLogger.error("Asset delete failed", { bucket, error });
    throw new AssetRequestError("Failed to delete file", 500);
  }
}
