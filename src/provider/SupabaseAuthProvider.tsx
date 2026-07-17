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

// Authentication is not required. When there is no signed-in session, the app
// acts as this shared anonymous user with full access. Keep the id in sync with
// ANONYMOUS_USER_ID in src/lib/supabase/server.ts and the seeded DB row.
const ANONYMOUS_USER: SessionUser = {
  id: "00000000-0000-0000-0000-000000000000",
  email: "anonymous@local",
  role: "ADMIN",
  hasAccess: true,
  isAdmin: true,
};

const AuthContext = createContext<AuthContextValue>({
  user: ANONYMOUS_USER,
  session: { user: ANONYMOUS_USER },
  isLoading: false,
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

  const [user, setUser] = useState<SessionUser>(ANONYMOUS_USER);
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
          role: "ADMIN",
          hasAccess: true,
          isAdmin: true,
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
          role: "ADMIN",
          hasAccess: true,
          isAdmin: true,
        });
      } else {
        setUser(ANONYMOUS_USER);
      }
      setIsLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  // Ensure each visitor has a distinct, isolated identity. If there is no
  // signed-in session (no real user and no existing anonymous session), sign
  // in anonymously so their content is scoped to this visitor instead of the
  // shared fallback user. Authentication is still not required — anyone can
  // use the app, they just get their own sandboxed space.
  useEffect(() => {
    let mounted = true;

    async function ensureIdentity() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!mounted) return;

      if (session?.user) return;

      const { error } = await supabase.auth.signInAnonymously({
        options: { data: { name: "Anonymous Visitor" } },
      });
      if (error) {
        // Anonymous sign-ins disabled/unavailable — the onAuthStateChange
        // handler keeps the shared anonymous user, so the app still works.
        console.warn("Anonymous sign-in unavailable:", error.message);
      }
    }

    ensureIdentity();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  const value = useMemo(
    () => ({
      user,
      session: { user },
      isLoading,
    }),
    [user, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
