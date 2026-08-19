import { createClient as createBrowserClient } from "./client";

// ============================================================================
// Client-side helpers (use in Client Components)
//
// NOTE: Keep this module free of server-only imports ("next/headers",
// "server-only"). It is imported by client components/hooks, so only the
// browser client is used here. Server-side uploads should import the server
// client directly in the relevant Server Action.
// ============================================================================

export async function uploadUserAssetClient(options: {
  bucket: string;
  userId: string;
  file: File;
  contentType?: string;
  prefix?: string;
}): Promise<{ path: string; publicUrl: string }> {
  const supabase = createBrowserClient();
  if (!supabase) {
    throw new Error("Supabase client is not configured");
  }

  const { bucket, userId, file, contentType, prefix = "files" } = options;
  const fileExt = file.name.split(".").pop() || "bin";
  const path = `${prefix}/${crypto.randomUUID()}.${fileExt}`;
  const fullPath = `users/${userId}/${path}`;

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(fullPath, file, {
      contentType: contentType ?? file.type ?? "application/octet-stream",
      upsert: false,
    });

  if (error) {
    throw error;
  }

  const publicUrl = getUserAssetPublicUrl({ bucket, path: data.path });

  return { path: data.path, publicUrl };
}

export async function deleteUserAssetClient(options: {
  bucket: string;
  path: string;
}): Promise<void> {
  const supabase = createBrowserClient();
  if (!supabase) {
    throw new Error("Supabase client is not configured");
  }

  const { bucket, path } = options;

  const { error } = await supabase.storage.from(bucket).remove([path]);

  if (error) {
    throw error;
  }
}

// ============================================================================
// Shared helpers
// ============================================================================

export function getUserAssetPublicUrl(options: {
  bucket: string;
  path: string;
}): string {
  const { bucket, path } = options;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not configured");
  }
  return `${url}/storage/v1/object/public/${bucket}/${path}`;
}
