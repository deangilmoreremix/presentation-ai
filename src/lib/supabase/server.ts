// No-op implementations for Supabase - not using authentication
// This file exists to satisfy imports but doesn't require env vars

export async function getUser(): Promise<null> {
  return null;
}

export async function getSession(): Promise<null> {
  return null;
}