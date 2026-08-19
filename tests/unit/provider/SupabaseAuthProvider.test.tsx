import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";

// Store mock implementations
const mockUser = vi.fn();
const mockIsLoaded = vi.fn(() => true);
const mockIsSignedIn = vi.fn(() => false);

vi.mock("@clerk/nextjs", () => ({
  useUser: () => ({
    user: mockUser(),
    isLoaded: mockIsLoaded(),
    isSignedIn: mockIsSignedIn(),
  }),
}));

import { SupabaseAuthProvider, useAuth } from "@/provider/SupabaseAuthProvider";

describe("SupabaseAuthProvider", () => {
  beforeEach(() => {
    mockUser.mockReturnValue(null);
    mockIsLoaded.mockReturnValue(true);
    mockIsSignedIn.mockReturnValue(false);
  });

  it("exposes user and session via useAuth", async () => {
    mockUser.mockReturnValueOnce({
      id: "u1",
      emailAddresses: [{ emailAddress: "t@t.com" }],
    });
    mockIsSignedIn.mockReturnValueOnce(true);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SupabaseAuthProvider>{children}</SupabaseAuthProvider>
    );
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {});
    expect(result.current.user?.id).toBe("u1");
    expect(result.current.session?.user.email).toBe("t@t.com");
  });

  it("returns anonymous user when not signed in", async () => {
    mockUser.mockReturnValueOnce(null);
    mockIsSignedIn.mockReturnValueOnce(false);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SupabaseAuthProvider>{children}</SupabaseAuthProvider>
    );
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {});
    expect(result.current.user?.id).toBe("00000000-0000-0000-0000-000000000000");
    expect(result.current.user?.email).toBe("anonymous@local");
  });

  it("returns loading state when Clerk is loading", async () => {
    mockIsLoaded.mockReturnValueOnce(false);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SupabaseAuthProvider>{children}</SupabaseAuthProvider>
    );
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.isLoading).toBe(true);
  });
});
