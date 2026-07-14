import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser-side Supabase client. Use in Client Components only.
 *
 * Returns `null` if Supabase env vars are not configured, allowing callers
 * to fail gracefully rather than throwing.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return null;
  }

  return createBrowserClient(url, key);
}

// Backwards-compatible default export. Many call sites import `supabase` directly.
export const supabase =
  typeof window !== "undefined" ? createClient() : null;
