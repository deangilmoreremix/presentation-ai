import { getCurrentUser, type CurrentUser } from "@/lib/supabase/server";

export type SessionUser = CurrentUser;

export type AuthSession = {
  user: SessionUser;
} | null;

export async function auth(): Promise<AuthSession> {
  const user = await getCurrentUser();

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
