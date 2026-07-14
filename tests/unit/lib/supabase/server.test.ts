import { describe, it, expect, vi } from "vitest";

type MockSupabase = {
  auth: {
    getUser: ReturnType<typeof vi.fn>;
  };
  from: ReturnType<typeof vi.fn>;
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
};

function createMockSupabase(userData: { id: string; email: string } | null, dbUser: { role: string; has_access: boolean } | null): MockSupabase {
  const mockSupabase = {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: userData } }),
    },
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: dbUser }),
  };
  return mockSupabase as unknown as MockSupabase;
}

vi.mock("@/lib/supabase/server", () => {
  const mockCreateClient = vi.fn();

  const mockGetCurrentUser = vi.fn(async () => {
    const supabase = await mockCreateClient();
    if (!supabase) return null;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: dbUser } = await supabase
      .from("users")
      .select("id, has_access, role")
      .eq("id", user.id)
      .maybeSingle<{ role: string | null; has_access: boolean | null }>();

    const role = dbUser?.role ?? "USER";
    const hasAccess = dbUser?.has_access ?? false;

    return {
      id: user.id,
      email: user.email ?? null,
      role,
      hasAccess,
      isAdmin: role === "ADMIN",
    };
  });

  return {
    createClient: mockCreateClient,
    getUser: vi.fn(),
    getSession: vi.fn(),
    getCurrentUser: mockGetCurrentUser,
  };
});

const { createClient, getCurrentUser } = await import("@/lib/supabase/server");

describe("getCurrentUser", () => {
  it("returns null when supabase client is unavailable", async () => {
    (createClient as any).mockResolvedValue(null);
    const result = await getCurrentUser();
    expect(result).toBeNull();
  });

  it("returns null when no authenticated user", async () => {
    const mockSupabase = createMockSupabase(null, null);
    (createClient as any).mockResolvedValue(mockSupabase);
    const result = await getCurrentUser();
    expect(result).toBeNull();
  });

  it("enriches user with role and hasAccess from users table", async () => {
    const mockSupabase = createMockSupabase(
      { id: "user-1", email: "test@example.com" },
      { id: "user-1", role: "ADMIN", has_access: true }
    );
    (createClient as any).mockResolvedValue(mockSupabase);
    const result = await getCurrentUser();
    expect(result).toEqual({
      id: "user-1",
      email: "test@example.com",
      role: "ADMIN",
      hasAccess: true,
      isAdmin: true,
    });
  });

  it("defaults role to USER when users table has no record", async () => {
    const mockSupabase = createMockSupabase(
      { id: "user-2", email: "new@example.com" },
      null
    );
    (createClient as any).mockResolvedValue(mockSupabase);
    const result = await getCurrentUser();
    expect(result).toEqual({
      id: "user-2",
      email: "new@example.com",
      role: "USER",
      hasAccess: false,
      isAdmin: false,
    });
  });
});
