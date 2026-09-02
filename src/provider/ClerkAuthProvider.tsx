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

interface Props {
  children: React.ReactNode;
}

export function ClerkAuthProvider({ children }: Props) {
  return <>{children}</>;
}

export function useAuth(): AuthContextValue {
  const { user, isLoaded } = useUser();

  const authUser: SessionUser | null = user
    ? {
        id: user.id,
        email: user.emailAddresses[0]?.emailAddress ?? null,
        role: (user.publicMetadata?.role as string) ?? "USER",
        hasAccess: (user.publicMetadata?.hasAccess as boolean) ?? false,
        isAdmin: (user.publicMetadata?.role as string) === "ADMIN",
      }
    : null;

  return {
    user: authUser,
    session: authUser ? { user: authUser } : null,
    isLoading: !isLoaded,
  };
}
