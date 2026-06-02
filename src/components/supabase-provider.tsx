"use client";

// Simplified provider for database-only access (no authentication)
// Supabase client is optional - returns null if env vars not configured

export function SupabaseProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Return children without supabase context if not configured
  return <>{children}</>;
}

export function useAuth() {
  // Always return anonymous session to match server auth
  return {
    session: {
      user: {
        id: "anonymous-user",
        email: null,
        name: "Anonymous User",
        isAdmin: false,
      },
      expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString(),
    },
    isLoading: false,
    isAuthenticated: true, // Consider anonymous as authenticated for the app
    user: {
      id: "anonymous-user",
      email: null,
      name: "Anonymous User",
      isAdmin: false,
    },
  };
}