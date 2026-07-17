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
  // Always return a full-access anonymous session to match server auth.
  // Authentication is not required; every visitor has full access.
  const anonymousUser = {
    id: "00000000-0000-0000-0000-000000000000",
    email: "anonymous@local",
    name: "Anonymous User",
    isAdmin: true,
  };

  return {
    session: {
      user: anonymousUser,
      expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString(),
    },
    isLoading: false,
    isAuthenticated: true,
    user: anonymousUser,
  };
}