import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { db } from "@/server/db";
import type { Session } from "@supabase/supabase-js";

export async function getUser() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch (error) {
            console.error("Error setting Supabase cookies:", error);
          }
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  return user;
}

export async function getSession() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch (error) {
            console.error("Error setting Supabase cookies:", error);
          }
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return null;
  }

  // Fetch user profile from database to include custom fields (role, hasAccess, etc.)
  const dbUser = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      role: true,
      hasAccess: true,
    },
  });

  const isAdmin = dbUser?.role === "ADMIN" || dbUser?.hasAccess === true;

  // Augment the session's user with custom fields
  const augmentedUser: typeof session.user & {
    isAdmin?: boolean;
    role?: string;
    hasAccess?: boolean;
  } = {
    ...session.user,
    isAdmin,
    role: dbUser?.role,
    hasAccess: dbUser?.hasAccess,
  };

  return {
    ...session,
    user: augmentedUser,
  } as Session;
}
