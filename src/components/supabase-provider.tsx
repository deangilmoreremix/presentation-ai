"use client";

import { createBrowserClient } from "@supabase/ssr";
import { type ReactNode, useState } from "react";

export function SupabaseProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [_supabase] = useState(() =>
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    ),
  );

  return <>{children}</>;
}

export function useAuth() {
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
    isAuthenticated: true,
    user: {
      id: "anonymous-user",
      email: null,
      name: "Anonymous User",
      isAdmin: false,
    },
  };
}