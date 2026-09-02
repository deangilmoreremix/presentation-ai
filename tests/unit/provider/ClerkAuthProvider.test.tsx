import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";

// Store mock implementations
const mockUser = vi.fn();
const mockIsLoaded = vi.fn(() => true);

vi.mock("@clerk/nextjs", () => ({
  useUser: () => ({
    user: mockUser(),
    isLoaded: mockIsLoaded(),
  }),
}));

import { ClerkAuthProvider, useAuth } from "@/provider/ClerkAuthProvider";

describe("ClerkAuthProvider", () => {
  beforeEach(() => {
    mockUser.mockReturnValue(null);
    mockIsLoaded.mockReturnValue(true);
  });

  it("exposes user and session via useAuth", async () => {
    mockUser.mockReturnValueOnce({
      id: "u1",
      emailAddresses: [{ emailAddress: "t@t.com" }],
      publicMetadata: { role: "USER", hasAccess: true },
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ClerkAuthProvider>{children}</ClerkAuthProvider>
    );
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {});
    expect(result.current.user?.id).toBe("u1");
    expect(result.current.user?.email).toBe("t@t.com");
    expect(result.current.user?.role).toBe("USER");
    expect(result.current.user?.isAdmin).toBe(false);
  });

  it("returns null user when not signed in", async () => {
    mockUser.mockReturnValueOnce(null);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ClerkAuthProvider>{children}</ClerkAuthProvider>
    );
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {});
    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
  });

  it("returns loading state when Clerk is loading", async () => {
    mockIsLoaded.mockReturnValueOnce(false);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ClerkAuthProvider>{children}</ClerkAuthProvider>
    );
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.isLoading).toBe(true);
  });

  it("reads role and hasAccess from publicMetadata", async () => {
    mockUser.mockReturnValueOnce({
      id: "u2",
      emailAddresses: [{ emailAddress: "admin@t.com" }],
      publicMetadata: { role: "ADMIN", hasAccess: true },
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ClerkAuthProvider>{children}</ClerkAuthProvider>
    );
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {});
    expect(result.current.user?.role).toBe("ADMIN");
    expect(result.current.user?.hasAccess).toBe(true);
    expect(result.current.user?.isAdmin).toBe(true);
  });
});
