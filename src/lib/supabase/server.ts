import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { db } from "@/server/db";
import type { Session } from "@supabase/supabase-js";

function createSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    if (process.env.NODE_ENV === "development" || process.env.SKIP_ENV_VALIDATION) {
      return null;
    }
    throw new Error("Supabase URL and Key are required. Set SKIP_ENV_VALIDATION=true for development.");
  }
  
  return supabaseUrl && supabaseKey ? { supabaseUrl, supabaseKey } : null;
}

export async function getUser() {
  const supabaseConfig = createSupabaseClient();
  if (!supabaseConfig) {
    return null;
  }
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
  const supabaseConfig = createSupabaseClient();
  if (!supabaseConfig) {
    return null;
  }
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
  // Wrap in try-catch for environments without database
  let dbUser: { role: string; hasAccess: boolean } | null = null;
  try {
    const result = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        role: true,
        hasAccess: true,
      },
    });
    dbUser = result;
  } catch (error) {
    console.warn("Database not available, returning session without custom fields");
  }

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
