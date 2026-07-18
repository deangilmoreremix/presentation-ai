import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server-side Supabase client using cookie-based auth.
 *
 * Use this in Server Actions, Route Handlers, and Server Components where
 * the request has a logged-in user session stored in cookies.
 *
 * Returns `null` if Supabase env vars are not configured (e.g. during
 * local development without Supabase), allowing callers to fail gracefully
 * rather than throwing.
 */
export async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Prefer the service role key on the server for trusted DB access;
  // fall back to the anon key (still authenticated via the user's session cookie).
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // `set` was called from a Server Component (read-only context).
          // Safe to ignore — middleware refreshes the session.
        }
      },
    },
  });
}

/**
 * Backwards-compatible exports. `getUser` and `getSession` previously
 * existed on this module; they now derive from the Supabase session.
 */
export async function getUser() {
  const supabase = await createClient();
  if (!supabase) {
    return null;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getSession() {
  const supabase = await createClient();
  if (!supabase) {
    return null;
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}

export type CurrentUser = {
  id: string;
  email: string | null;
  role: string;
  hasAccess: boolean;
  isAdmin: boolean;
};

/**
 * Stable id for the seeded anonymous row in `auth.users` / `public.users`.
 * Retained for foreign-key safety; the shared anonymous-user fallback has
 * been removed from `getCurrentUser`, which now returns `null` when there is
 * no authenticated session.
 */
export const ANONYMOUS_USER_ID = "00000000-0000-0000-0000-000000000000";

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  type UsersRow = {
    id: string;
    has_access: boolean | null;
    role: string | null;
  };

  const { data: dbUser } = await supabase
    .from("users")
    .select("id, has_access, role")
    .eq("id", user.id)
    .maybeSingle<UsersRow>();

  const role = dbUser?.role ?? "USER";
  const hasAccess = dbUser?.has_access ?? false;

  return {
    id: user.id,
    email: user.email ?? null,
    role,
    hasAccess,
    isAdmin: role === "ADMIN",
  };
}
