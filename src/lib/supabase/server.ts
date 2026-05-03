import { createClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function getUser() {
  const cookieStore = await cookies();

  const supabase = createClient<Database>(
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
  const user = await getUser();
  
  if (!user) {
    return null;
  }

  // Get user profile from database if needed
  // You can extend this with additional user data from your 'users' table
  
  return {
    user: {
      id: user.id,
      email: user.email,
      user_metadata: user.user_metadata,
      app_metadata: user.app_metadata,
    },
  };
}