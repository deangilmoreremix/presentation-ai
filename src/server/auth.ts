/**
 * Authentication helper using Supabase
 * Returns anonymous user when no auth session is present
 */

import { getSession, getUser } from "@/lib/supabase/server";

const ANONYMOUS_USER = {
  id: "anonymous",
  email: null,
  name: "Anonymous User",
  image: null,
  isAdmin: false,
};

const ANONYMOUS_EXPIRES = () =>
  new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString();

export async function auth() {
  try {
    const [user, session] = await Promise.all([getUser(), getSession()]);

    if (user) {
      const expires =
        session?.expires_at != null
          ? new Date(session.expires_at * 1000).toISOString()
          : new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();

      return {
        user: {
          id: user.id,
          email: user.email ?? null,
          name:
            (user.user_metadata?.name as string | undefined) ??
            user.email ??
            null,
          image:
            (user.user_metadata?.avatar_url as string | undefined) ??
            (user.user_metadata?.picture as string | undefined) ??
            null,
          isAdmin: false,
        },
        expires,
      };
    }
  } catch (error) {
    console.error("Auth error:", error);
  }

  return {
    user: ANONYMOUS_USER,
    expires: ANONYMOUS_EXPIRES(),
  };
}