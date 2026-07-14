"use client";

import { createBrowserClient } from "@supabase/ssr";
import type React from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

interface SessionUser {
  id: string;
  email: string | null;
  role: string;
  hasAccess: boolean;
  isAdmin: boolean;
}

interface AuthContextValue {
  user: SessionUser | null;
  session: { user: SessionUser } | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  isLoading: true,
});

interface Props {
  children: React.ReactNode;
}

export function SupabaseAuthProvider({ children }: Props) {
  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      ),
    [],
  );

  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!mounted) return;

      if (user) {
        setUser({
          id: user.id,
          email: user.email ?? null,
          role: "USER",
          hasAccess: false,
          isAdmin: false,
        });
      }
      setIsLoading(false);
    }

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email ?? null,
          role: "USER",
          hasAccess: false,
          isAdmin: false,
        });
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const value = useMemo(
    () => ({
      user,
      session: user ? { user } : null,
      isLoading,
    }),
    [user, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
