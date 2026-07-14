import { getCurrentUser } from "@/lib/supabase/server";

export type SessionUser = {
  id: string;
  email: string | null;
  role: string;
  hasAccess: boolean;
  isAdmin: boolean;
};

export type AuthSession = {
  user: SessionUser;
} | null;

/**
 * Backwards-compatible `auth()` that derives the session from Supabase Auth so
 * the many server actions that call `await auth()` require no changes.
 */
export async function auth(): Promise<AuthSession> {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      hasAccess: user.hasAccess,
      isAdmin: user.isAdmin,
    },
  };
}
