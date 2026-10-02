// ============================================================================
// Client-side helpers (use in Client Components)
//
// NOTE: Keep this module free of server-only imports ("next/headers",
// "server-only", "@/lib/supabase/server"). It is imported by client
// components/hooks.
//
// The buckets' `storage.objects` policies key off `auth.uid()`, which is
// always null in a Clerk-only app, so a browser client could never write.
// Uploads therefore run server-side against `/api/assets/upload`, which
// resolves the owning user from the Clerk session and uses the service-role
// client. See `src/lib/supabase/storage-server.ts`.
// ============================================================================

const UPLOAD_ENDPOINT = "/api/assets/upload";

export type UserAsset = {
  path: string;
  publicUrl: string;
};

async function readError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string };
    if (typeof body?.error === "string") return body.error;
  } catch {
    // Non-JSON error body; fall through to the status text.
  }
  return response.statusText || "Upload failed";
}

/**
 * Uploads `file` into `bucket` under `users/{authenticatedUserId}/{prefix}/`.
 *
 * The user id is resolved server-side and is intentionally NOT a parameter —
 * accepting one would let any caller write into another user's folder.
 * Returns `{ path, publicUrl }`; `publicUrl` is a stable public Storage URL.
 */
export async function uploadUserAssetClient(options: {
  bucket: string;
  file: File;
  prefix?: string;
}): Promise<UserAsset> {
  const { bucket, file, prefix = "files" } = options;

  const formData = new FormData();
  // The filename is only a hint for the server's extension allowlist (browsers
  // report `application/octet-stream` for some fonts); it is sanitised here
  // and re-derived from an allowlist there.
  formData.set("file", file, sanitiseFileName(file.name));
  formData.set("bucket", bucket);
  formData.set("prefix", prefix);

  const response = await fetch(UPLOAD_ENDPOINT, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  const result = (await response.json()) as UserAsset;
  if (!result?.path || !result?.publicUrl) {
    throw new Error("Malformed upload response");
  }

  return result;
}

/**
 * Removes an object previously written by {@link uploadUserAssetClient}.
 * The server rejects paths outside `users/{authenticatedUserId}/`.
 */
export async function deleteUserAssetClient(options: {
  bucket: string;
  path: string;
}): Promise<void> {
  const { bucket, path } = options;

  const response = await fetch(UPLOAD_ENDPOINT, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bucket, path }),
  });

  if (!response.ok) {
    throw new Error(await readError(response));
  }
}

/** Strips path separators so a filename can never read as a directory. */
function sanitiseFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "upload";
  const cleaned = base.replace(/[^\w.\- ]+/g, "_").slice(0, 128);
  return cleaned.length > 0 ? cleaned : "upload";
}

// ============================================================================
// Shared helpers
// ============================================================================

export { getUserAssetPublicUrl } from "@/lib/supabase/storage-url";
