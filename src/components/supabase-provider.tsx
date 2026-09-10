"use client";

import { createBrowserClient } from "@supabase/ssr";
import { type ReactNode } from "react";

import { useAuth as useSupabaseAuth } from "@/provider/SupabaseAuthProvider";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseAnonKey
  ? createBrowserClient(supabaseUrl, supabaseAnonKey)
  : null;

const ANONYMOUS_FALLBACK_USER = {
  id: "00000000-0000-0000-0000-000000000000",
  email: "anonymous@local",
  name: "Anonymous User",
  isAdmin: true,
};

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

export function SupabaseProvider({
  children,
}: {
  children: ReactNode;
}) {
  return <>{children}</>;
}

export function useAuth() {
  const { user, session, isLoading } = useSupabaseAuth();

  const id = user?.id ?? fallbackUser.id;
  const email = user?.email ?? fallbackUser.email;
  const name = user?.email
    ? user.email.split("@")[0]
    : fallbackUser.name;
  const isAdmin = user?.isAdmin ?? fallbackUser.isAdmin;
  const isAuthenticated = !!user && user.id !== fallbackUser.id;

  return {
    session: session ?? fallbackUser.session,
    user: user ?? fallbackUser.user,
    id,
    email,
    name,
    isAdmin,
    isLoading,
    isAuthenticated,
  };
}

export { supabase };
