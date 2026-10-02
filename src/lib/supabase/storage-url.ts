/**
 * Builds the public URL for an object in a Supabase Storage bucket.
 *
 * Lives in its own module (rather than in `storage.ts`) so both the browser
 * helpers and the server-side upload action can use it without importing each
 * other.
 */
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
