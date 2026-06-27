import { createClient as createSupabaseClient } from "@supabase/supabase-js";

let cachedAdmin: ReturnType<typeof createSupabaseClient> | null = null;

export function createAdminClient() {
  if (cachedAdmin) return cachedAdmin;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase URL or service role key missing");
  }
  cachedAdmin = createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedAdmin;
}