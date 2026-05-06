"use client";

import { createClient } from "@supabase/supabase-js";
import { type ReactNode, useState } from "react";

// Simplified provider for database-only access (no authentication)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

export function SupabaseProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [supabase] = useState(() =>
    createClient(supabaseUrl, supabaseAnonKey)
  );

  return (
    <>
      {children}
    </>
  );
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