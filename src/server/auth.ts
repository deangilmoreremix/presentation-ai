/**
 * Supabase authentication helper for server-side routes
 * Replaces NextAuth's auth() function
 */

import { getSession } from "@/lib/supabase/server";

export async function auth() {
  const session = await getSession();
  
  if (!session) {
    return null;
  }

  // Transform Supabase session to NextAuth-like structure for compatibility
  return {
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.user_metadata?.full_name || session.user.user_metadata?.name,
      image: session.user.user_metadata?.avatar_url,
      // Add any additional fields you need
      ...session.user.user_metadata,
    },
    // You can add other NextAuth session properties if needed
    expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(), // 7 days
  };
}