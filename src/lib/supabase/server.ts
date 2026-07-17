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
 * Fixed anonymous user used when there is no authenticated session.
 * Seeded by supabase migration 009 into auth.users + public.users so that
 * foreign keys on user_id are satisfied. Authentication is not required to
 * use any feature; unauthenticated requests act as this shared user.
 */
export const ANONYMOUS_USER_ID = "00000000-0000-0000-0000-000000000000";

const ANONYMOUS_USER: CurrentUser = {
  id: ANONYMOUS_USER_ID,
  email: "anonymous@local",
  role: "ADMIN",
  hasAccess: true,
  isAdmin: true,
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();
  if (!supabase) return ANONYMOUS_USER;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return ANONYMOUS_USER;

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
