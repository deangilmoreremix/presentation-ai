import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { SupabaseAuthProvider, useAuth } from "@/provider/SupabaseAuthProvider";

vi.mock("@supabase/ssr", () => ({
  createBrowserClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "u1", email: "t@t.com" } },
      }),
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
    expect(result.current.user.id).toBe("u1");
    expect(result.current.session.user.email).toBe("t@t.com");
  });
});
