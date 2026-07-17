import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { createBrowserClient } from "@supabase/ssr";
import { SupabaseAuthProvider, useAuth } from "@/provider/SupabaseAuthProvider";

const signInAnonymously = vi.fn().mockResolvedValue({
  data: { user: { id: "anon-1" }, session: {} },
  error: null,
});

vi.mock("@supabase/ssr", () => ({
  createBrowserClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "u1", email: "t@t.com" } },
      }),
      getSession: vi.fn().mockResolvedValue({
        data: { session: { user: { id: "u1", email: "t@t.com" } } },
      }),
      signInAnonymously,
      onAuthStateChange: vi.fn((callback) => {
        callback("SIGNED_IN", { user: { id: "u1", email: "t@t.com" } });
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      }),
    },
  })),
}));

describe("SupabaseAuthProvider", () => {
  it("exposes user and session via useAuth", async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SupabaseAuthProvider>{children}</SupabaseAuthProvider>
    );
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {});
    expect(result.current.user?.id).toBe("u1");
    expect(result.current.session?.user.email).toBe("t@t.com");
  });

  it("signs in anonymously when there is no existing session", async () => {
    // Existing session present -> should NOT sign in anonymously.
    signInAnonymously.mockClear();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SupabaseAuthProvider>{children}</SupabaseAuthProvider>
    );
    renderHook(() => useAuth(), { wrapper });
    await act(async () => {});
    expect(signInAnonymously).not.toHaveBeenCalled();

    // Now simulate no session -> should sign in anonymously.
    signInAnonymously.mockClear();
    vi.mocked(createBrowserClient).mockReturnValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
        getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
        signInAnonymously,
        onAuthStateChange: vi.fn(() => ({
          data: { subscription: { unsubscribe: vi.fn() } },
        })),
      },
    } as never);
    renderHook(() => useAuth(), { wrapper });
    await act(async () => {});
    expect(signInAnonymously).toHaveBeenCalledTimes(1);
  });
});
