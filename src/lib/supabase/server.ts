// Supabase server helpers for edge functions
// No auth currently - just return basic session info

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function getUser() {
  const cookieStore = await cookies();
  
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
        },
      },
    );
    
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  } catch {
    return null;
  }
}

export async function getSession() {
  try {
    return await getUser();
  } catch {
    return null;
  }
}