// Supabase server helpers - optional configuration
// If Supabase env vars are not set, return null (no auth)

export async function getUser(): Promise<null> {
  // Supabase auth is optional
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return null;
  }
  
  return null;
}

export async function getSession(): Promise<null> {
  return getUser();
}