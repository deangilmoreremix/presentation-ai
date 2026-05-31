/**
 * Authentication helper using Supabase
 * Returns anonymous user when no auth is configured
 */

import { getUser } from "@/lib/supabase/server";

const ANONYMOUS_USER = {
  id: "anonymous",
  email: null,
  name: "Anonymous User",
  image: null,
  isAdmin: false,
};

export async function auth() {
  try {
    const user = await getUser();
    
    if (user) {
      return {
        user: {
          ...user,
          isAdmin: false,
        },
        expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString(),
      };
    }
  } catch (error) {
    console.error("Auth error:", error);
  }
  
  // Return anonymous user
  return {
    user: ANONYMOUS_USER,
    expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString(),
  };
}