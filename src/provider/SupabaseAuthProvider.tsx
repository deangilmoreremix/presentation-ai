"use client";

import { useUser } from "@clerk/nextjs";
import type React from "react";

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

const ANONYMOUS_USER: SessionUser = {
  id: "00000000-0000-0000-0000-000000000000",
  email: "anonymous@local",
  role: "USER",
  hasAccess: true,
  isAdmin: false,
};

interface Props {
  children: React.ReactNode;
}

export function SupabaseAuthProvider({ children }: Props) {
  return <>{children}</>;
}

export function useAuth(): AuthContextValue {
  const { user, isLoaded } = useUser();

  const authUser: SessionUser | null = user
    ? {
        id: user.id,
        email: user.emailAddresses[0]?.emailAddress ?? null,
        role: "ADMIN",
        hasAccess: true,
        isAdmin: true,
      }
    : null;

  return {
    user: authUser ?? ANONYMOUS_USER,
    session: { user: authUser ?? ANONYMOUS_USER },
    isLoading: !isLoaded,
  };
}
