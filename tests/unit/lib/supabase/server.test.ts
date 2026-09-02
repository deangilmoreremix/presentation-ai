import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
  currentUser: vi.fn(),
}));

import { getCurrentUser, ANONYMOUS_USER_ID } from "@/lib/supabase/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { auth, currentUser } from "@clerk/nextjs/server";

const ORIGINAL_ENV = process.env;

type MockSupabaseClient = {
  from: ReturnType<typeof vi.fn>;
};

function createMockSupabaseClient(
  dbUser: { id: string; role: string; has_access: boolean } | null
): MockSupabaseClient {
  return {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: dbUser }),
        }),
      }),
    }),
  };
}

function setupEnv() {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
}

describe("getCurrentUser", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env = { ...ORIGINAL_ENV };
    vi.mocked(auth).mockResolvedValue({ userId: null, sessionId: null } as any);
    vi.mocked(currentUser).mockResolvedValue(null as any);
  });

  it("returns anonymous user when no authenticated session", async () => {
    setupEnv();
    const mockSupabase = createMockSupabaseClient(null);
    vi.mocked(createServerClient).mockReturnValue(mockSupabase as any);
    vi.mocked(cookies).mockReturnValue({
      getAll: vi.fn(),
      setAll: vi.fn(),
    } as any);

    const result = await getCurrentUser();
    expect(result.id).toBe(ANONYMOUS_USER_ID);
    expect(result.email).toBeNull();
    expect(result.role).toBe("USER");
    expect(result.hasAccess).toBe(false);
    expect(result.isAdmin).toBe(false);
  });

  it("returns user from Clerk when authenticated", async () => {
    setupEnv();
    const mockSupabase = createMockSupabaseClient({
      id: "clerk-user-id",
      role: "ADMIN",
      has_access: true,
    });
    vi.mocked(createServerClient).mockReturnValue(mockSupabase as any);
    vi.mocked(cookies).mockReturnValue({
      getAll: vi.fn(),
      setAll: vi.fn(),
    } as any);
    vi.mocked(auth).mockResolvedValue({ userId: "clerk-user-id", sessionId: "s1" } as any);
    vi.mocked(currentUser).mockResolvedValue({
      primaryEmailAddress: { emailAddress: "admin@example.com" },
      publicMetadata: { role: "ADMIN", hasAccess: true },
    } as any);

    const result = await getCurrentUser();
    expect(result.id).toBe("clerk-user-id");
    expect(result.email).toBe("admin@example.com");
    expect(result.role).toBe("ADMIN");
    expect(result.hasAccess).toBe(true);
    expect(result.isAdmin).toBe(true);
  });

  it("defaults role to USER when users table has no record", async () => {
    setupEnv();
    const mockSupabase = createMockSupabaseClient(null);
    vi.mocked(createServerClient).mockReturnValue(mockSupabase as any);
    vi.mocked(cookies).mockReturnValue({
      getAll: vi.fn(),
      setAll: vi.fn(),
    } as any);
    vi.mocked(auth).mockResolvedValue({ userId: "clerk-user-id", sessionId: "s1" } as any);
    vi.mocked(currentUser).mockResolvedValue({
      primaryEmailAddress: { emailAddress: "user@example.com" },
      publicMetadata: { role: "USER", hasAccess: false },
    } as any);

    const result = await getCurrentUser();
    expect(result.role).toBe("USER");
    expect(result.hasAccess).toBe(false);
    expect(result.isAdmin).toBe(false);
  });

  it("falls back to anonymous when supabase client is unavailable", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    vi.mocked(createServerClient).mockReturnValue(null as any);
    vi.mocked(cookies).mockReturnValue({
      getAll: vi.fn(),
      setAll: vi.fn(),
    } as any);

    const result = await getCurrentUser();
    expect(result.id).toBe(ANONYMOUS_USER_ID);
    expect(result.email).toBeNull();
    expect(result.role).toBe("USER");
    expect(result.hasAccess).toBe(false);
    expect(result.isAdmin).toBe(false);
  });
});
