import { describe, it, expect, vi } from "vitest";

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

import { getCurrentUser, ANONYMOUS_USER_ID } from "@/lib/supabase/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const ORIGINAL_ENV = process.env;

const ANONYMOUS_USER = {
  id: ANONYMOUS_USER_ID,
  email: "anonymous@local",
  role: "ADMIN",
  hasAccess: true,
  isAdmin: true,
};

type MockSupabaseClient = {
  auth: {
    getUser: ReturnType<typeof vi.fn>;
  };
  from: ReturnType<typeof vi.fn>;
};

function createMockSupabaseClient(
  userData: { id: string; email: string } | null,
  dbUser: { id: string; role: string; has_access: boolean } | null
): MockSupabaseClient {
  const mockSupabase = {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: userData } }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: dbUser }),
        }),
      }),
    }),
  };

  return mockSupabase;
}

function setupEnv() {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
}

describe("getCurrentUser", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env = { ...ORIGINAL_ENV };
  });

  it("returns the anonymous user when supabase client is unavailable", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    vi.mocked(createServerClient).mockReturnValue(null as any);
    vi.mocked(cookies).mockReturnValue({
      getAll: vi.fn(),
      setAll: vi.fn(),
    } as any);

    const result = await getCurrentUser();
    expect(result).toEqual(ANONYMOUS_USER);
  });

  it("returns the anonymous user when no authenticated session", async () => {
    setupEnv();
    const mockSupabase = createMockSupabaseClient(null, null);
    vi.mocked(createServerClient).mockReturnValue(mockSupabase as any);
    vi.mocked(cookies).mockReturnValue({
      getAll: vi.fn(),
      setAll: vi.fn(),
    } as any);

    const result = await getCurrentUser();
    expect(result).toEqual(ANONYMOUS_USER);
  });

  it("enriches user with role and hasAccess from users table", async () => {
    setupEnv();
    const mockSupabase = createMockSupabaseClient(
      { id: "user-1", email: "test@example.com" },
      { id: "user-1", role: "ADMIN", has_access: true }
    );
    vi.mocked(createServerClient).mockReturnValue(mockSupabase as any);
    vi.mocked(cookies).mockReturnValue({
      getAll: vi.fn(),
      setAll: vi.fn(),
    } as any);

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
    setupEnv();
    const mockSupabase = createMockSupabaseClient(
      { id: "user-2", email: "new@example.com" },
      null
    );
    vi.mocked(createServerClient).mockReturnValue(mockSupabase as any);
    vi.mocked(cookies).mockReturnValue({
      getAll: vi.fn(),
      setAll: vi.fn(),
    } as any);

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
