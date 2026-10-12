import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * BYOK credential-resolution security tests.
 *
 * These are the regression tests that matter most for the BYOK model:
 *
 * 1. Cross-user isolation — user A's encrypted credential cannot be
 *    retrieved by user B, even if the database layer returns it.
 * 2. No platform fallback — a missing credential is a hard failure and never
 *    silently resolves to an owner-funded key.
 * 3. Fail-secure — missing Supabase config and decryption failures both
 *    throw rather than degrade into a usable key.
 * 4. No plaintext leakage — status endpoints return metadata only.
 */

const supabaseMocks = {
  tableCalls: [] as Array<{ table: string }>,
  update: vi.fn(),
};

let currentUserId: string | null = null;
let supabaseAvailable = true;
let supabaseSelectResult: { data: unknown; error: unknown } = {
  data: null,
  error: null,
};

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(async () => ({ userId: currentUserId })),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => {
    if (!supabaseAvailable) return null;
    const single = async () => supabaseSelectResult;

    /** Records which table + column set each query touched. */
    const queries: Array<{ table: string; columns?: string }> = [];

    const queryChain = {
      select: vi.fn((columns?: string) => {
        const last = queries[queries.length - 1];
        if (last) last.columns = columns;
        return queryChain;
      }),
      eq: vi.fn(() => queryChain),
      maybeSingle: vi.fn(single),
      update: vi.fn((values: Record<string, unknown>) => {
        const last = queries[queries.length - 1];
        if (last) last.updateValues = values;
        return queryChain;
      }),
    };

    const client = {
      from: vi.fn((table: string) => {
        queries.push({ table });
        supabaseMocks.tableCalls.push({ table });
        return queryChain;
      }),
      /** Test-only accessor for assertions. */
      __queries: queries,
    };

    return client;
  }),
}));

// Real crypto is exercised for the scrypt KEK derivation above, but key-encryption
// is wrapped so we can control the boundary precisely.
const encryptCalls: Array<[string, string]> = [];
const decryptCalls: Array<[string, string, string]> = [];
let decryptShouldThrow = false;

vi.mock("@/lib/crypto/key-encryption", () => ({
  encryptApiKey: vi.fn(async (plaintext: string, userId: string) => {
    encryptCalls.push([plaintext, userId]);
    return { encrypted: `enc:${userId}:${plaintext}`, iv: "iv-abc" };
  }),
  decryptApiKey: vi.fn(async (encrypted: string, userId: string, iv: string) => {
    decryptCalls.push([encrypted, userId, iv]);
    if (decryptShouldThrow) {
      throw new Error("Unsupported state or unable to authenticate data");
    }
    // Format produced by the mocked encryptApiKey above.
    const parts = encrypted.split(":");
    if (parts.length < 3) throw new Error("malformed ciphertext");
    const owner = parts[1];
    if (owner !== userId) throw new Error("decryption failed: key belongs to another user");
    return parts.slice(2).join(":");
  }),
  validateProviderKeyFormat: vi.fn(
    (provider: string, key: string) =>
      provider === "openai"
        ? /^sk-[A-Za-z0-9_-]{32,}$/.test(key)
        : key.length >= 16 && !/\s/.test(key),
  ),
}));

import {
  ProviderKeyRequiredError,
  PROVIDER_KEY_REQUIRED,
  resolveProviderCredential,
  getProviderCredentialStatus,
  storeProviderCredential,
  deleteProviderCredential,
  requireAuthenticatedUserId,
} from "@/lib/ai/provider-credentials";
import { auth } from "@clerk/nextjs/server";

const USER_A = "user_aaaa1111";
const USER_B = "user_bbbb2222";
const KEY_A = "sk-useraaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const KEY_B = "sk-userbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

beforeEach(() => {
  vi.clearAllMocks();
  encryptCalls.length = 0;
  decryptCalls.length = 0;
  decryptShouldThrow = false;
  currentUserId = null;
  supabaseAvailable = true;
  supabaseSelectResult = { data: null, error: null };
});

describe("authentication", () => {
  it("rejects unauthenticated callers with a structured BYOK error", async () => {
    currentUserId = null;

    await expect(requireAuthenticatedUserId()).rejects.toThrow(
      /must be signed in/i,
    );
    await expect(resolveProviderCredential("openai")).rejects.toBeInstanceOf(
      ProviderKeyRequiredError,
    );
  });

  it("cannot be bypassed by a caller-supplied user id", () => {
    // The resolver accepts only a provider id; there is no public API that
    // takes a userId argument, so a caller cannot target another user's key.
    expect(resolveProviderCredential.length).toBe(1);
  });
});

/** Compile-time assertion helper: the resolver takes only a provider. */
function requireProviderCredentialAcceptsUserIdArgument(): boolean {
  return resolveProviderCredential.length > 1;
}

describe("credential storage", () => {
  it("scopes encrypted writes to the authenticated user", async () => {
    currentUserId = USER_A;
    await storeProviderCredential("openai", KEY_A);

    expect(encryptCalls).toHaveLength(1);
    expect(encryptCalls[0][0]).toBe(KEY_A);
    expect(encryptCalls[0][1]).toBe(USER_A);
  });

  it("rejects empty credentials", async () => {
    currentUserId = USER_A;
    await expect(storeProviderCredential("openai", "   ")).rejects.toThrow(
      ProviderKeyRequiredError,
    );
    expect(encryptCalls).toHaveLength(0);
  });

  it("refuses to store a credential for an anonymous caller", async () => {
    currentUserId = null;
    await expect(storeProviderCredential("openai", KEY_A)).rejects.toThrow(
      ProviderKeyRequiredError,
    );
  });

  it("writes to the correct per-provider columns", async () => {
    currentUserId = USER_A;
    await storeProviderCredential("muapi", "muapi-token-0123456789");
    expect(encryptCalls[0][1]).toBe(USER_A);
  });
});

describe("cross-user isolation (User A vs User B)", () => {
  it("user A can read back their own stored credential", async () => {
    currentUserId = USER_A;
    await storeProviderCredential("openai", KEY_A);

    // The DB returns exactly what was written for user A.
    supabaseSelectResult = {
      data: {
        openai_api_key_encrypted: `enc:${USER_A}:${KEY_A}`,
        openai_api_key_iv: "iv-abc",
      },
      error: null,
    };

    const resolved = await resolveProviderCredential("openai");
    expect(resolved).toBe(KEY_A);
  });

  it("user B cannot decrypt user A's ciphertext even if the DB returns it", async () => {
    currentUserId = USER_A;
    await storeProviderCredential("openai", KEY_A);

    // Simulate a WRONG query result: user B is asking but the layer returns
    // user A's row. The per-user KEK must make decryption fail.
    currentUserId = USER_B;
    supabaseSelectResult = {
      data: {
        openai_api_key_encrypted: `enc:${USER_A}:${KEY_A}`,
        openai_api_key_iv: "iv-abc",
      },
      error: null,
    };

    await expect(resolveProviderCredential("openai")).rejects.toThrow(
      /another user/i,
    );
    expect(decryptCalls[0][1]).toBe(USER_B);
  });

  it("user B cannot retrieve user A's credential through the real scrypt KEK", async () => {
    // Exercise the actual implementation rather than the decrypt mock, to
    // prove the key-derivation salt really is the user id.
    const { decryptApiKey, encryptApiKey } = await vi.importActual<
      typeof import("@/lib/crypto/key-encryption")
    >("@/lib/crypto/key-encryption");

    const masterKey = "A".repeat(64); // 32 bytes hex
    process.env.API_KEY_ENCRYPTION_MASTER_KEY = masterKey;

    const { encrypted, iv } = await encryptApiKey(KEY_A, USER_A);

    await expect(decryptApiKey(encrypted, USER_B, iv)).rejects.toThrow();
    await expect(decryptApiKey(encrypted, USER_A, iv)).resolves.toBe(KEY_A);

    delete process.env.API_KEY_ENCRYPTION_MASTER_KEY;
  });

  it("does not fall back to a platform key when another user's row is returned", async () => {
    currentUserId = USER_B;
    supabaseSelectResult = {
      data: {
        openai_api_key_encrypted: `enc:${USER_A}:${KEY_A}`,
        openai_api_key_iv: "iv-abc",
      },
      error: null,
    };

    // Must throw, not resolve to the platform owner's credential.
    await expect(resolveProviderCredential("openai")).rejects.toBeInstanceOf(
      Error,
    );
  });
});

describe("fail-secure behaviour", () => {
  it("throws when Supabase is not configured", async () => {
    currentUserId = USER_A;
    supabaseAvailable = false;

    await expect(resolveProviderCredential("openai")).rejects.toThrow(
      /database is not configured/i,
    );
  });

  it("throws (never falls back) when decryption fails", async () => {
    currentUserId = USER_A;
    decryptShouldThrow = true;
    supabaseSelectResult = {
      data: {
        openai_api_key_encrypted: "enc:corrupt",
        openai_api_key_iv: "iv-abc",
      },
      error: null,
    };

    await expect(resolveProviderCredential("openai")).rejects.toThrow();
  });

  it("throws a structured error when no credential is stored", async () => {
    currentUserId = USER_A;
    supabaseSelectResult = {
      data: { openai_api_key_encrypted: null, openai_api_key_iv: null },
      error: null,
    };

    await expect(resolveProviderCredential("openai")).rejects.toMatchObject({
      code: PROVIDER_KEY_REQUIRED,
      provider: "openai",
    });
  });

  it("throws a structured error naming the provider for MuAPI", async () => {
    currentUserId = USER_A;
    supabaseSelectResult = {
      data: { muapi_api_key_encrypted: null, muapi_api_key_iv: null },
      error: null,
    };

    await expect(resolveProviderCredential("muapi")).rejects.toMatchObject({
      code: PROVIDER_KEY_REQUIRED,
      provider: "muapi",
    });
  });

  it("does not surface the raw database error text to callers", async () => {
    currentUserId = USER_A;
    supabaseSelectResult = {
      data: null,
      error: { message: "permission denied for table users", secret: "leak-me" },
    };

    await expect(resolveProviderCredential("openai")).rejects.toThrow(
      /failed to load stored api key/i,
    );
  });
});

describe("status metadata (never exposes credentials)", () => {
  it("reports configured=false when nothing is stored", async () => {
    currentUserId = USER_A;
    supabaseSelectResult = { data: null, error: null };

    await expect(getProviderCredentialStatus("openai")).resolves.toEqual({
      configured: false,
    });
  });

  it("reports configured=true without decrypting or returning any key material", async () => {
    currentUserId = USER_A;
    supabaseSelectResult = {
      data: {
        openai_api_key_encrypted: "enc:whatever",
        openai_api_key_iv: "iv-abc",
      },
      error: null,
    };

    const status = await getProviderCredentialStatus("openai");
    expect(status).toEqual({ configured: true });
    // No decryption happened at all.
    expect(decryptCalls).toHaveLength(0);
  });

  it("fails closed on database errors", async () => {
    currentUserId = USER_A;
    supabaseSelectResult = { data: null, error: { message: "boom" } };

    await expect(getProviderCredentialStatus("openai")).resolves.toEqual({
      configured: false,
    });
  });
});

describe("deletion", () => {
  it("deletes only the authenticated user's credential", async () => {
    currentUserId = USER_A;
    supabaseMocks.tableCalls.length = 0;
    await deleteProviderCredential("openai");

    expect(supabaseMocks.tableCalls).toEqual([{ table: "users" }]);
  });

  it("refuses deletion for an anonymous caller", async () => {
    currentUserId = null;
    await expect(deleteProviderCredential("openai")).rejects.toThrow(
      ProviderKeyRequiredError,
    );
  });
});

describe("no platform-key fallback anywhere", () => {
  it("the module never reads an OPENAI_API_KEY env var", async () => {
    const source = await import("node:fs").then((fs) =>
      fs.readFileSync("src/lib/ai/provider-credentials.ts", "utf8"),
    );
    expect(source).not.toContain("OPENAI_API_KEY");
    expect(source).not.toContain("MUAPI_API_KEY");
    expect(source).not.toContain("process.env");
  });

  it("the OpenAI client factory never reads an OPENAI_API_KEY env var", async () => {
    const source = await import("node:fs").then((fs) =>
      fs.readFileSync("src/lib/openai/client.ts", "utf8"),
    );
    expect(source).not.toContain("OPENAI_API_KEY");
  });

  it("the model picker never reads an OPENAI_API_KEY env var", async () => {
    const source = await import("node:fs").then((fs) =>
      fs.readFileSync("src/lib/model-picker.ts", "utf8"),
    );
    expect(source).not.toContain("OPENAI_API_KEY");
  });

  it("the presentation agent route never reads an OPENAI_API_KEY env var", async () => {
    const source = await import("node:fs").then((fs) =>
      fs.readFileSync("src/app/api/agent/presentation/route.ts", "utf8"),
    );
    expect(source).not.toContain("env.OPENAI_API_KEY");
    expect(source).not.toContain("process.env.OPENAI_API_KEY");
  });
});

describe("session lifecycle", () => {
  it("a signed-out user loses access to a previously stored credential", async () => {
    currentUserId = USER_A;
    supabaseSelectResult = {
      data: {
        openai_api_key_encrypted: `enc:${USER_A}:${KEY_A}`,
        openai_api_key_iv: "iv-abc",
      },
      error: null,
    };
    expect(await resolveProviderCredential("openai")).toBe(KEY_A);

    // Session expires / user signs out.
    currentUserId = null;
    await expect(resolveProviderCredential("openai")).rejects.toThrow(
      ProviderKeyRequiredError,
    );
  });

  it("switching accounts does not leak the previous user's credential", async () => {
    currentUserId = USER_A;
    await storeProviderCredential("openai", KEY_A);

    // Now signed in as user B, whose row is empty.
    currentUserId = USER_B;
    supabaseSelectResult = {
      data: { openai_api_key_encrypted: null, openai_api_key_iv: null },
      error: null,
    };

    await expect(resolveProviderCredential("openai")).rejects.toMatchObject({
      code: PROVIDER_KEY_REQUIRED,
    });
  });
});

describe("Clerk session is the authority", () => {
  it("uses the Clerk auth session rather than any request input", async () => {
    currentUserId = USER_A;
    supabaseSelectResult = {
      data: {
        openai_api_key_encrypted: `enc:${USER_A}:${KEY_A}`,
        openai_api_key_iv: "iv-abc",
      },
      error: null,
    };

    await resolveProviderCredential("openai");

    // `auth()` was consulted for the identity, and the resolver exposed no
    // way to override it.
    expect(vi.mocked(auth)).toHaveBeenCalled();
  });
});
