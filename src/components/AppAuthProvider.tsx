"use client";

import { createBrowserClient } from "@supabase/ssr";
import { type ReactNode } from "react";

import { useAuth as useClerkAuth } from "@/provider/ClerkAuthProvider";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseAnonKey
  ? createBrowserClient(supabaseUrl, supabaseAnonKey)
  : null;

interface AppAuthContextValue {
  session: { user: { id: string; email: string | null; role: string; hasAccess: boolean; isAdmin: boolean } } | null;
  user: { id: string; email: string | null; role: string; hasAccess: boolean; isAdmin: boolean } | null;
  id: string | null;
  email: string | null;
  name: string | null;
  isAdmin: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export function AppAuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  return <>{children}</>;
}

export function useAuth(): AppAuthContextValue {
  const { user, session, isLoading } = useClerkAuth();

  const id = user?.id ?? null;
  const email = user?.email ?? null;
  const name = user?.email ? (user.email.split("@")[0] as string) : null;
  const isAdmin = user?.isAdmin ?? false;
  const isAuthenticated = !!user;

  return {
    session: session ?? null,
    user: user ?? null,
    id: id ?? null,
    email: email ?? null,
    name: name ?? null,
    isAdmin,
    isLoading,
    isAuthenticated,
  };
}

export { supabase };
