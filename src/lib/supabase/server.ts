import "server-only";

import { auth, currentUser } from "@clerk/nextjs/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";

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
 * `getCurrentUser` returns an anonymous user object (with this id) when
 * there is no authenticated session, rather than returning `null`.
 */
export const ANONYMOUS_USER_ID = "00000000-0000-0000-0000-000000000000";

export async function getClerkUserId(): Promise<string> {
  const { userId } = await auth();
  if (userId) {
    await ensureUserProvisioned(userId);
    return userId;
  }
  return ANONYMOUS_USER_ID;
}

/**
 * Ensures a `users` row exists for a signed-in Clerk user before any write that
 * carries `user_id`.
 *
 * Every identity column in this schema has a foreign key to `users(clerk_id)`,
 * so a signed-in user without a row cannot create a presentation, a theme, or a
 * favourite. The Clerk webhook normally creates that row, but webhooks are
 * asynchronous (and absent in local development), so the first request after
 * sign-in would otherwise fail on the foreign key.
 *
 * This intentionally writes only `clerk_id` and `updated_at`: profile fields
 * (email, name, image) are owned by the Clerk webhook, and a profile-less
 * upsert would otherwise blank them out on every request.
 *
 * `cache` collapses repeated calls into a single upsert per request. A failure
 * is logged rather than thrown so identity resolution still degrades to the
 * previous behaviour instead of breaking the whole request.
 */
export const ensureUserProvisioned = cache(
  async (clerkUserId: string): Promise<void> => {
    const supabase = await createClient();
    if (!supabase) {
      return;
    }

    const { error } = await supabase.from("users").upsert(
      {
        clerk_id: clerkUserId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "clerk_id" },
    );

    if (error) {
      console.error("Failed to provision Clerk user:", error);
    }
  },
);

export async function getCurrentUser(): Promise<CurrentUser> {
  const _supabase = await createClient();
  const { userId } = await auth();

  if (!userId) {
    return {
      id: ANONYMOUS_USER_ID,
      email: null,
      role: "USER",
      hasAccess: false,
      isAdmin: false,
    };
  }

  // Callers pass `user.id` straight into `user_id` columns, so the row that
  // those foreign keys point at has to exist first.
  await ensureUserProvisioned(userId);

  // Prefer Clerk publicMetadata as the source of truth for authz.
  let clerkPublicMetadata: Record<string, unknown> = {};
  try {
    const clerkUser = await currentUser();
    clerkPublicMetadata = (clerkUser?.publicMetadata as Record<string, unknown>) ?? {};
  } catch {
    // Clerk user fetch unavailable; fall back to Supabase cache/defaults below.
  }

  const roleFromMetadata = typeof clerkPublicMetadata.role === "string"
    ? clerkPublicMetadata.role
    : null;
  const hasAccessFromMetadata = typeof clerkPublicMetadata.hasAccess === "boolean"
    ? clerkPublicMetadata.hasAccess
    : null;

  // Optional cache: keep Supabase users table in sync, but do not use it
  // as the source of truth for authz decisions.
  let email: string | null = null;
  try {
    const clerkUser = await currentUser();
    email = clerkUser?.primaryEmailAddress?.emailAddress ?? null;
  } catch {
    // Clerk user fetch unavailable; keep email as null
  }

  const role = roleFromMetadata ?? "USER";
  const hasAccess = hasAccessFromMetadata ?? false;

  return {
    id: userId,
    email,
    role,
    hasAccess,
    isAdmin: role === "ADMIN",
  };
}
