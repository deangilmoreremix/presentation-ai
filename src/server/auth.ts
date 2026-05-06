/**
 * Authentication helper that returns anonymous user for database operations
 * Authentication is removed but database functionality is preserved
 */

import { db } from "@/server/db";

const ANONYMOUS_USER_ID = "anonymous-user";

const ANONYMOUS_USER = {
  id: ANONYMOUS_USER_ID,
  email: null,
  name: "Anonymous User",
  image: null,
  isAdmin: false,
};

export async function auth() {
  // Ensure anonymous user exists in database
  try {
    await db.user.upsert({
      where: { id: ANONYMOUS_USER_ID },
      update: {}, // No updates needed
      create: {
        id: ANONYMOUS_USER_ID,
        name: "Anonymous User",
        role: "USER",
        hasAccess: false,
      },
    });
  } catch (error) {
    console.error("Failed to create anonymous user:", error);
    // Continue anyway - the user might already exist
  }

  // Always return anonymous user for database operations
  return {
    user: ANONYMOUS_USER,
    expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString(), // 1 year
  };
}