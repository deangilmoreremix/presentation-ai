# Replace NextAuth + Google with Supabase Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove Google OAuth and NextAuth entirely, replacing them with Supabase Auth as the sole authentication mechanism.

**Architecture:** All server-side auth checks will go through a new `getCurrentUser()` helper in `src/lib/supabase/server.ts` that calls `supabase.auth.getUser()` and enriches with the `role`/`has_access` fields from the users table. Client-side auth state will be provided by a new `SupabaseAuthProvider` React context that mirrors the former `SessionProvider` shape. The proxy, server actions, API routes, authorization helpers, and UI will all migrate from NextAuth helpers to Supabase equivalents.

**Tech Stack:** Next.js 16, Supabase (`@supabase/ssr`, `@supabase/supabase-js`), React 19, Zustand

## Global Constraints

- Use `supabase.auth.getUser()` for authenticated user lookups (never `supabase.auth.getSession()` for access control).
- The `getCurrentUser()` return shape must match what `auth()` currently returns so callers need minimal changes: `{ id, email, role, hasAccess, isAdmin } | null`.
- Preserve existing redirect behavior in `proxy.ts`: unauthenticated users → `/auth/signin`, auth pages → `/presentation`, `/` → `/presentation`.
- Remove only NextAuth/Google code; keep all Supabase database usage unchanged.
- Remove the `"google"` variant from `PresentationStockImageProvider` and `imageSearchState`.
- Remove `next-auth` from `package.json` dependencies.

---

## Phase 1: Supabase Server Auth Layer

### Task 1: Add `getCurrentUser()` to Supabase server module

**Files:**
- Modify: `src/lib/supabase/server.ts:1-75`
- Test: `tests/unit/lib/supabase/server.test.ts`

**Interfaces:**
- Consumes: existing `createClient()` in the same file
- Produces: `getCurrentUser()` returning `{ id: string; email: string | null; role: string; hasAccess: boolean; isAdmin: boolean } | null`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/lib/supabase/server.test.ts
import { getCurrentUser } from "@/lib/supabase/server";

jest.mock("@/lib/supabase/server", () => ({
  ...jest.requireActual("@/lib/supabase/server"),
  createClient: jest.fn(),
}));

const { createClient } = require("@/lib/supabase/server");

describe("getCurrentUser", () => {
  it("returns null when supabase client is unavailable", async () => {
    (createClient as jest.Mock).mockResolvedValue(null);
    const result = await getCurrentUser();
    expect(result).toBeNull();
  });

  it("returns null when no authenticated user", async () => {
    const mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: null } }),
      },
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null }),
    };
    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
    const result = await getCurrentUser();
    expect(result).toBeNull();
  });

  it("enriches user with role and hasAccess from users table", async () => {
    const mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: "user-1", email: "test@example.com" } },
        }),
      },
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: { id: "user-1", role: "ADMIN", has_access: true },
      }),
    };
    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
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
    const mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: "user-2", email: "new@example.com" } },
        }),
      },
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null }),
    };
    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/unit/lib/supabase/server.test.ts -v`
Expected: FAIL with "getCurrentUser is not a function"

- [ ] **Step 3: Write minimal implementation**

Append to `src/lib/supabase/server.ts`:

```typescript
export type CurrentUser = {
  id: string;
  email: string | null;
  role: string;
  hasAccess: boolean;
  isAdmin: boolean;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  type UsersRow = {
    id: string;
    has_access: boolean | null;
    role: string | null;
  };

  const { data: dbUser } = await supabase
    .from("users")
    .select("id, has_access, role")
    .eq("id", user.id)
    .maybeSingle<UsersRow>();

  const role = dbUser?.role ?? "USER";
  const hasAccess = dbUser?.has_access ?? false;

  return {
    id: user.id,
    email: user.email ?? null,
    role,
    hasAccess,
    isAdmin: role === "ADMIN",
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/unit/lib/supabase/server.test.ts -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/supabase/server.ts tests/unit/lib/supabase/server.test.ts
git commit -m "feat(auth): add getCurrentUser() Supabase auth helper"
```

---

### Task 2: Create SupabaseAuthProvider for client-side session state

**Files:**
- Create: `src/provider/SupabaseAuthProvider.tsx`
- Modify: `src/app/layout.tsx:1-36`

**Interfaces:**
- Consumes: `@supabase/ssr` `createBrowserClient`, `@supabase/auth-ui-react` or manual `onAuthStateChange`
- Produces: `SupabaseAuthProvider` React context + `useAuth()` client hook

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/provider/SupabaseAuthProvider.test.tsx
import { renderHook, act } from "@testing-library/react";
import { SupabaseAuthProvider, useAuth } from "@/provider/SupabaseAuthProvider";

jest.mock("@supabase/ssr", () => ({
  createBrowserClient: jest.fn(() => ({
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: { session: { user: { id: "u1", email: "t@t.com" } } },
      }),
      onAuthStateChange: jest.fn((_, cb) => {
        cb("SIGNED_IN", { user: { id: "u1", email: "t@t.com" } });
        return { data: { subscription: { unsubscribe: jest.fn() } } };
      }),
    },
  })),
}));

describe("SupabaseAuthProvider", () => {
  it("exposes user and session via useAuth", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SupabaseAuthProvider>{children}</SupabaseAuthProvider>
    );
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.user.id).toBe("u1");
    expect(result.current.session.user.email).toBe("t@t.com");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/unit/provider/SupabaseAuthProvider.test.tsx -v`
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Write minimal implementation**

Create `src/provider/SupabaseAuthProvider.tsx`:

```tsx
"use client";

import { createBrowserClient } from "@supabase/ssr";
import type React from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

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

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  isLoading: true,
});

interface Props {
  children: React.ReactNode;
}

export function SupabaseAuthProvider({ children }: Props) {
  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      ),
    [],
  );

  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!mounted) return;

      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email ?? null,
          role: "USER",
          hasAccess: false,
          isAdmin: false,
        });
      }
      setIsLoading(false);
    }

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email ?? null,
          role: "USER",
          hasAccess: false,
          isAdmin: false,
        });
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const value = useMemo(
    () => ({
      user,
      session: user ? { user } : null,
      isLoading,
    }),
    [user, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
```

Modify `src/app/layout.tsx`:
- Remove `import NextAuthProvider from "@/provider/NextAuthProvider";`
- Add `import { SupabaseAuthProvider } from "@/provider/SupabaseAuthProvider";`
- Replace `<NextAuthProvider>` with `<SupabaseAuthProvider>`

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/unit/provider/SupabaseAuthProvider.test.tsx -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/provider/SupabaseAuthProvider.tsx src/app/layout.tsx
git commit -m "feat(auth): add SupabaseAuthProvider client auth context"
```

---

## Phase 2: Migrate Server Consumer Code

### Task 3: Replace NextAuth imports with SupabaseAuth in all server actions

**Files:**
- Modify: `src/server/share/authorization.ts`, `src/app/_actions/presentation/sharedPresentationActions.ts`, `src/app/_actions/presentation/theme-actions.ts`, `src/app/_actions/presentation/theme-favorite-actions.ts`, `src/app/_actions/presentation/theme-like-actions.ts`, `src/app/_actions/presentation/uploaded-image-actions.ts`, `src/app/_actions/presentation/presentation-thumbnail-actions.ts`, `src/app/_actions/presentation/font-pair-actions.ts`, `src/app/_actions/presentation/getPresentationMessages.ts`, `src/app/_actions/presentation/generate-slide-image.ts`, `src/app/_actions/notebook/presentation/presentationActions.ts`, `src/app/_actions/notebook/presentation/fetchPresentations.ts`, `src/app/_actions/notebook/presentation/presentationFavoriteActions.ts`, `src/app/_actions/notebook/presentation/clearPresentationChat.ts`, `src/app/_actions/image/generate.ts`, `src/app/_actions/image/unsplash.ts`, `src/app/_actions/apps/image-studio/generate.ts`, `src/app/_actions/apps/image-studio/fetch.ts`, `src/app/_actions/apps/image-studio/generate-infographic.ts`

**Consumes:** `getCurrentUser` from `src/lib/supabase/server.ts` produces the same `{ id }` shape that existing `auth()` calls use.

- [ ] **Step 1: Write the failing test**

No new tests required for this bulk migration; run existing test suite to confirm no breakage.

- [ ] **Step 2: Run tests to establish baseline**

Run: `npx jest --testPathIgnorePatterns="integration" -v`
Expected: PASS (baseline before changes)

- [ ] **Step 3: Apply migration changes**

For each file listed above, replace:
```typescript
import { auth } from "@/server/auth";
// ...
const session = await auth();
const userId = session?.user.id;
```

With:
```typescript
import { getCurrentUser } from "@/lib/supabase/server";
// ...
const currentUser = await getCurrentUser();
const userId = currentUser?.id;
```

Where the code previously checked `session.user.isAdmin`, replace with `currentUser?.isAdmin`.
Replace `session?.user.email` with `currentUser?.email`.
Replace `session?.user.role` with `currentUser?.role`.

In `src/server/share/authorization.ts`, change `getSessionIdentity()` to:
```typescript
export async function getSessionIdentity() {
  const currentUser = await getCurrentUser();
  return {
    userId: currentUser?.id ?? null,
    userEmail: currentUser?.email ?? null,
  };
}
```

- [ ] **Step 4: Run tests to verify**

Run: `npx jest --testPathIgnorePatterns="integration" -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/server/share/authorization.ts \
  src/app/_actions/presentation/sharedPresentationActions.ts \
  src/app/_actions/presentation/theme-actions.ts \
  src/app/_actions/presentation/theme-favorite-actions.ts \
  src/app/_actions/presentation/theme-like-actions.ts \
  src/app/_actions/presentation/uploaded-image-actions.ts \
  src/app/_actions/presentation/presentation-thumbnail-actions.ts \
  src/app/_actions/presentation/font-pair-actions.ts \
  src/app/_actions/presentation/getPresentationMessages.ts \
  src/app/_actions/presentation/generate-slide-image.ts \
  src/app/_actions/notebook/presentation/presentationActions.ts \
  src/app/_actions/notebook/presentation/fetchPresentations.ts \
  src/app/_actions/notebook/presentation/presentationFavoriteActions.ts \
  src/app/_actions/notebook/presentation/clearPresentationChat.ts \
  src/app/_actions/image/generate.ts \
  src/app/_actions/image/unsplash.ts \
  src/app/_actions/apps/image-studio/generate.ts \
  src/app/_actions/apps/image-studio/fetch.ts \
  src/app/_actions/apps/image-studio/generate-infographic.ts
git commit -m "refactor(auth): replace auth() with getCurrentUser() in server actions"
```

---

### Task 4: Replace `auth()` in API route handlers

**Files:**
- Modify: `src/app/api/uploadthing/core.ts`, `src/app/api/uploadthing/lib.ts`, `src/app/api/presentation/generate/route.ts`, `src/app/api/presentation/generate-slide/route.ts`, `src/app/api/presentation/generate-image-slides/route.ts`, `src/app/api/presentation/outline/route.ts`, `src/app/api/presentation/text-to-diagram/route.ts`, `src/app/api/presentation/prompt-to-diagram/route.ts`, `src/app/api/presentation/edit-diagram/route.ts`, `src/app/api/agent/presentation/search/route.ts`, `src/app/api/agent/presentation/route.ts`, `src/app/api/presentation/local-models/route.ts`, `src/app/api/user/api-key/validate/route.ts`

**Consumes:** `getCurrentUser` from `src/lib/supabase/server.ts`

- [ ] **Step 1: Run existing API tests as baseline**

Run: `npx jest --testPathPattern="api" -v`
Expected: establish baseline

- [ ] **Step 2: Apply migration changes**

Replace:
```typescript
import { auth } from "@/server/auth";
// ...
const session = await auth();
if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
```

With:
```typescript
import { getCurrentUser } from "@/lib/supabase/server";
// ...
const currentUser = await getCurrentUser();
if (!currentUser?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
```

Where `session.user.isAdmin` is checked, replace with `currentUser.isAdmin`.
Where `session.user.email` is used, replace with `currentUser.email`.

- [ ] **Step 3: Run API tests**

Run: `npx jest --testPathPattern="api" -v`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/app/api/uploadthing/core.ts \
  src/app/api/uploadthing/lib.ts \
  src/app/api/presentation/generate/route.ts \
  src/app/api/presentation/generate-slide/route.ts \
  src/app/api/presentation/generate-image-slides/route.ts \
  src/app/api/presentation/outline/route.ts \
  src/app/api/presentation/text-to-diagram/route.ts \
  src/app/api/presentation/prompt-to-diagram/route.ts \
  src/app/api/presentation/edit-diagram/route.ts \
  src/app/api/agent/presentation/search/route.ts \
  src/app/api/agent/presentation/route.ts \
  src/app/api/presentation/local-models/route.ts \
  src/app/api/user/api-key/validate/route.ts
git commit -m "refactor(auth): replace auth() with getCurrentUser() in API routes"
```

---

### Task 5: Update proxy, sign-in UI, and sign-out UI

**Files:**
- Modify: `src/proxy.ts`, `src/app/auth/signin/page.tsx`, `src/app/auth/signout/page.tsx`

**Interfaces:**
- Consumes: `getCurrentUser` from `src/lib/supabase/server.ts`
- Produces: updated redirect behavior and Supabase auth UI

- [ ] **Step 1: Update proxy.ts**

Replace with:
```typescript
import { getCurrentUser } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const currentUser = await getCurrentUser();
  const isAuthPage = request.nextUrl.pathname.startsWith("/auth");

  if (request.nextUrl.pathname === "/") {
    return NextResponse.redirect(new URL("/presentation", request.url));
  }

  if (isAuthPage && currentUser) {
    return NextResponse.redirect(new URL("/presentation", request.url));
  }

  if (!currentUser && !isAuthPage && !request.nextUrl.pathname.startsWith("/api")) {
    return NextResponse.redirect(
      new URL(
        `/auth/signin?callbackUrl=${encodeURIComponent(request.url)}`,
        request.url,
      ),
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
```

- [ ] **Step 2: Rewrite sign-in page for Supabase Auth**

Replace `src/app/auth/signin/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";

export default function SignIn() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!supabase) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-slate-900 px-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold">Configuration Error</CardTitle>
            <CardDescription>
              Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-slate-900 px-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
          <CardDescription>Sign in to your account to continue</CardDescription>
          {error && (
            <div
              className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
              role="alert"
            >
              <span className="block sm:inline">{error}</span>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignIn} className="grid gap-4">
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Button type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col items-center justify-center gap-2">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            By signing in, you agree to our Terms of Service and Privacy Policy.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
```

- [ ] **Step 3: Rewrite sign-out page for Supabase Auth**

Replace `src/app/auth/signout/page.tsx`:

```tsx
"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";

export default function SignOut() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const supabase = createClient();

  const handleSignOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    router.push(callbackUrl);
  };

  const handleCancel = () => {
    router.push(callbackUrl);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-slate-900 px-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">Sign Out</CardTitle>
          <CardDescription>Are you sure you want to sign out?</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex flex-col space-y-4">
            <Button onClick={handleSignOut}>Yes, sign me out</Button>
            <Button variant="outline" onClick={handleCancel}>
              No, take me back
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 4: Update image-source-selector to use Supabase client hook**

Replace `src/components/ui/image-source-selector.tsx`:
- Remove `import { useSession } from "next-auth/react"`
- Add `import { useAuth } from "@/provider/SupabaseAuthProvider"`
- Replace `const { data: session } = useSession()` with `const { user } = useAuth()`
- Replace `session?.user?.isAdmin` with `user?.isAdmin`

- [ ] **Step 5: Update tests**

Run: `npx jest --testPathIgnorePatterns="integration" -v`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/proxy.ts \
  src/app/auth/signin/page.tsx \
  src/app/auth/signout/page.tsx \
  src/components/ui/image-source-selector.tsx
git commit -m "feat(auth): update proxy, sign-in, sign-out to Supabase Auth"
```

---

## Phase 3: Remove NextAuth and Google Code

### Task 6: Remove NextAuth API route and Google image search action

**Files:**
- Delete: `src/app/api/auth/[...nextauth]/route.ts`, `src/app/_actions/apps/image-studio/google.ts`
- Delete: `src/provider/NextAuthProvider.tsx`

- [ ] **Step 1: Delete files**

```bash
rm src/app/api/auth/[...nextauth]/route.ts
rm src/app/_actions/apps/image-studio/google.ts
rm src/provider/NextAuthProvider.tsx
```

- [ ] **Step 2: Verify no remaining NextAuth imports**

Run: `grep -r "from \"next-auth\"" src/`
Expected: No matches.

- [ ] **Step 3: Run tests**

Run: `npx jest --testPathIgnorePatterns="integration" -v`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove NextAuth API route, Google image search, and NextAuthProvider"
```

---

### Task 7: Remove Google from Zustand state and image source options

**Files:**
- Modify: `src/states/presentation-state.ts:69`, `src/states/presentation-state.ts:452-461`, `src/states/presentation-state.ts:614-618`

**Interfaces:**
- Produces: Updated `PresentationStockImageProvider` type = `"unsplash" | "pixabay"`

- [ ] **Step 1: Remove "google" from the type**

In `src/states/presentation-state.ts` line 69, change:
```typescript
export type PresentationStockImageProvider = "unsplash" | "pixabay" | "google";
```
To:
```typescript
export type PresentationStockImageProvider = "unsplash" | "pixabay";
```

- [ ] **Step 2: Remove googleQuery from initial state**

In `imageSearchState` initial value (lines 614-618), change:
```typescript
imageSearchState: {
  mode: "unsplash",
  unsplashQuery: "",
  pixabayQuery: "",
  googleQuery: "",
},
```
To:
```typescript
imageSearchState: {
  mode: "unsplash",
  unsplashQuery: "",
  pixabayQuery: "",
},
```

- [ ] **Step 3: Remove googleQuery from setImageSearchState type**

In lines 454-461, change:
```typescript
setImageSearchState: (
  state: Partial<{
    mode: PresentationStockImageProvider;
    unsplashQuery: string;
    pixabayQuery: string;
    googleQuery: string;
  }>,
) => void;
```
To:
```typescript
setImageSearchState: (
  state: Partial<{
    mode: PresentationStockImageProvider;
    unsplashQuery: string;
    pixabayQuery: string;
  }>,
) => void;
```

- [ ] **Step 4: Remove "stock-google" option from image-source-selector**

In `src/components/ui/image-source-selector.tsx`, remove the line:
```tsx
<SelectItem value="stock-google">Web Search</SelectItem>
```

- [ ] **Step 5: Run tests**

Run: `npx jest --testPathIgnorePatterns="integration" -v`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/states/presentation-state.ts src/components/ui/image-source-selector.tsx
git commit -m "chore: remove google stock image provider from state and UI"
```

---

### Task 8: Update environment variable definitions and `.env.example`

**Files:**
- Modify: `src/env.js`
- Modify: `.env.example`

- [ ] **Step 1: Remove NextAuth/Google env vars from src/env.js**

Remove the following lines:
- `GOOGLE_CLIENT_ID: z.string(),`
- `GOOGLE_CLIENT_SECRET: z.string(),`
- `NEXTAUTH_URL: z.preprocess(...)`
- `NEXTAUTH_SECRET: z.string()...`
- `GOOGLE_CUSTOM_SEARCH_API_KEY: z.string().optional(),`
- `SEARCH_ENGINE_CX: z.string().optional(),`
And their `runtimeEnv` mappings.

The resulting server block should only have:
```javascript
server: {
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  DATABASE_URL: z.string().url(),
  TAVILY_API_KEY: z.string().optional(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  OPENAI_API_KEY: z.string().optional(),
  TOGETHER_AI_API_KEY: z.string().optional(),
  FAL_API_KEY: z.string().optional(),
  PINECONE_API_KEY: z.string().optional(),
  UNSPLASH_ACCESS_KEY: z.string().optional(),
},
```

- [ ] **Step 2: Update `.env.example`**

Remove the commented-out Google lines if any. The file should reference only Supabase, database, OpenAI, Unsplash, Tavily, UploadThing, and `SKIP_ENV_VALIDATION`.

Verify `.env.example` matches the current content referenced earlier (it currently does not mention Google, so no changes needed there).

- [ ] **Step 3: Run env validation**

Run: `npx tsx src/env.js` or `pnpm type`
Expected: PASS with no missing env vars for client vars.

- [ ] **Step 4: Commit**

```bash
git add src/env.js .env.example
git commit -m "chore: remove NextAuth and Google env vars from env schema"
```

---

### Task 9: Remove `next-auth` from package.json and clean dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Remove `next-auth` from dependencies**

Remove `"next-auth"` from the `dependencies` object. (It is not listed explicitly but is used via `next-auth/react`; verify it's not a transitive-only dep by checking the lockfile.)

- [ ] **Step 2: Verify install still resolves**

Run: `pnpm install`
Expected: PASS (or if `next-auth` is explicitly needed by other deps, note it but no app code imports remain).

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: remove next-auth dependency"
```

---

## Phase 4: Verification

### Task 10: Full test suite and type-check

- [ ] **Step 1: Type-check**

Run: `pnpm type`
Expected: PASS with no TypeScript errors.

- [ ] **Step 2: Unit tests**

Run: `npx jest --testPathIgnorePatterns="integration" -v`
Expected: PASS.

- [ ] **Step 3: Integration tests**

Run: `pnpm test`
Expected: PASS (or note any failures attributable to removed Google auth flow).

- [ ] **Step 4: Parse check**

Run: `pnpm check` (or `biome check .`)
Expected: PASS.

- [ ] **Step 5: Final grep for leftover NextAuth or Google auth imports**

Run: `grep -rn "next-auth" src/`
Expected: No matches.

Run: `grep -rn "GOOGLE_CLIENT" src/`
Expected: No matches.

Run: `grep -rn "GoogleProvider" src/`
Expected: No matches.

Run: `grep -rn "from \"next-auth/react\"" src/`
Expected: No matches.

Run: `grep -rn "searchGoogleImages\|getImageFromGoogle" src/`
Expected: No matches.

- [ ] **Step 6: Commit final verification**

```bash
git add -A
git commit -m "chore: verify NextAuth/Google removal complete"
```

---

## Summary of Commits

```
feat(auth): add getCurrentUser() Supabase auth helper
feat(auth): add SupabaseAuthProvider client auth context
refactor(auth): replace auth() with getCurrentUser() in server actions
refactor(auth): replace auth() with getCurrentUser() in API routes
feat(auth): update proxy, sign-in, sign-out to Supabase Auth
chore: remove NextAuth API route, Google image search, and NextAuthProvider
chore: remove google stock image provider from state and UI
chore: remove NextAuth and Google env vars from env schema
chore: remove next-auth dependency
chore: verify NextAuth/Google removal complete
```
