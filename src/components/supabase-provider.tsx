"use client";

import { SessionContextProvider, useSession } from "@supabase/auth-helpers-react";
import { createClient } from "@supabase/supabase-js";
import { type ReactNode, useEffect, useState } from "react";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

export function SupabaseProvider({ children }: { children: ReactNode }) {
  const [supabase] = useState(() =>
    createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  );

  return (
    <SessionContextProvider supabaseClient={supabase}>
      {children}
    </SessionContextProvider>
  );
}

export function useAuth() {
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status !== "loading") {
      setIsLoading(false);
    }
  }, [status]);

  return {
    session,
    isLoading,
    isAuthenticated: !!session,
    user: session?.user,
  };
}