"use client";

import { createClient, type Session } from "@supabase/supabase-js";
import { type ReactNode, useEffect, useState } from "react";

// Database access where authentication is not strictly required. Each visitor
// gets a real (anonymous) Supabase session so their content is isolated,
// without ever needing to log in.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

// Single shared browser client (env vars are static at runtime).
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const ANONYMOUS_FALLBACK_USER = {
  id: "00000000-0000-0000-0000-000000000000",
  email: "anonymous@local",
  name: "Anonymous User",
  isAdmin: true,
};

export function SupabaseProvider({
  children,
}: {
  children: ReactNode;
}) {
  // Give each visitor a distinct, isolated identity on first load.
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
        console.warn("Anonymous sign-in unavailable:", error.message);
      }
    }

    ensureIdentity();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <>
      {children}
    </>
  );
}

const fallbackUser = {
  session: {
    user: ANONYMOUS_FALLBACK_USER,
    expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString(),
  },
  isLoading: false,
  isAuthenticated: true,
  user: ANONYMOUS_FALLBACK_USER,
  id: ANONYMOUS_FALLBACK_USER.id,
  email: ANONYMOUS_FALLBACK_USER.email,
  name: ANONYMOUS_FALLBACK_USER.name,
  isAdmin: ANONYMOUS_FALLBACK_USER.isAdmin,
};

export function useAuth() {
  // Return a full-access session. Authentication is not required; every
  // visitor has full feature access. The real Supabase session (if present)
  // carries a distinct id so content is isolated per visitor.
  const [state, setState] = useState(fallbackUser);

  useEffect(() => {
    let mounted = true;

    function toState(session: Session | null) {
      if (!session?.user) return fallbackUser;
      const u = {
        id: session.user.id,
        email: session.user.email ?? "anonymous@local",
        name: "Anonymous Visitor",
        isAdmin: true,
      };
      return {
        session: {
          user: u,
          expires:
            session.expires_at != null
              ? new Date(session.expires_at * 1000).toISOString()
              : fallbackUser.session.expires,
        },
        isLoading: false,
        isAuthenticated: true,
        user: u,
        id: u.id,
        email: u.email,
        name: u.name,
        isAdmin: u.isAdmin,
      };
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) setState(toState(session));
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) setState(toState(session));
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return state;
}