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
    // getUser returns null in the stub implementation
    // Auth is optional - always returns anonymous user
  } catch (error) {
    console.error("Auth error:", error);
  }
  
  // Return anonymous user
  return {
    user: ANONYMOUS_USER,
    expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString(),
  };
}