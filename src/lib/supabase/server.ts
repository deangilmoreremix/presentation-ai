// Supabase server helpers - optional configuration
// If Supabase env vars are not set, return null (no auth)

export async function getUser(): Promise<null> {
  // Supabase auth is optional - return null for anonymous user
  return null;
}

export async function getSession(): Promise<null> {
  return null;
}