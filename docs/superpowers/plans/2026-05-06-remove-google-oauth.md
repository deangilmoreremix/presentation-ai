# Remove Google OAuth Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Completely remove Google OAuth authentication from the Presentation AI application, enabling anonymous usage.

**Architecture:** Remove all Supabase authentication components, update API routes to work without authentication, and modify UI to not require or display auth state.

**Tech Stack:** Next.js, TypeScript, Supabase (to be removed), Tailwind CSS

---

### Task 1: Remove Authentication Pages and Routes

**Files:**
- Remove: `src/app/auth/signin/page.tsx`
- Remove: `src/app/auth/signout/page.tsx`
- Remove: `src/app/auth/callback/route.ts`
- Remove: `src/app/auth/layout.tsx`

- [ ] **Step 1: Delete auth directory**

Delete the entire `/src/app/auth/` directory and all its contents.

```bash
rm -rf src/app/auth/
```

- [ ] **Step 2: Commit auth pages removal**

```bash
git add .
git commit -m "feat: remove authentication pages and routes"
```

### Task 2: Remove Supabase Authentication Dependencies and Imports

**Files:**
- Modify: `package.json`
- Modify: `src/app/layout.tsx`
- Modify: `src/components/supabase-provider.tsx`
- Modify: `src/components/navigation/Navigation.tsx`
- Modify: `src/server/auth.ts`
- Modify: `src/lib/supabase/server.ts`

- [ ] **Step 1: Remove Supabase auth packages from package.json**

Remove these dependencies:
- `@supabase/auth-helpers-react`
- `@supabase/ssr`
- `@supabase/supabase-js`

```json
{
  "dependencies": {
    // Remove these lines:
    // "@supabase/auth-helpers-react": "^0.5.0",
    // "@supabase/ssr": "^0.10.2", 
    // "@supabase/supabase-js": "^2.105.1",
  }
}
```

- [ ] **Step 2: Update root layout to remove SupabaseProvider**

Remove SupabaseProvider wrapper and getSession call from `src/app/layout.tsx`.

```tsx
// Remove these imports:
import { SupabaseProvider } from "@/components/supabase-provider";
import { getSession } from "@/lib/supabase/server";

// Update RootLayout:
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Remove: const initialSession = await getSession();

  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        {/* Remove SupabaseProvider wrapper: */}
        <TanStackQueryProvider>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            {children}
          </ThemeProvider>
        </TanStackQueryProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Replace SupabaseProvider with anonymous provider**

Update `src/components/supabase-provider.tsx` to provide anonymous user context.

```tsx
// Replace entire file content:
"use client";

import { type ReactNode } from "react";

export function SupabaseProvider({
  children,
}: {
  children: ReactNode;
}) {
  return <>{children}</>;
}

export function useAuth() {
  return {
    session: null,
    isLoading: false,
    isAuthenticated: false,
    user: null,
  };
}
```

- [ ] **Step 4: Update Navigation component**

Remove auth state display from `src/components/navigation/Navigation.tsx`.

```tsx
// Remove these imports:
import { useAuth } from "@/components/supabase-provider";
import { Sparkles, Settings, LogOut } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

// Update Navigation component:
export function Navigation() {
  // Remove auth-related state and handlers

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">ALLWEONE®</span>
          </Link>

          {/* Remove auth buttons - keep navigation clean */}
          <div className="flex items-center space-x-4">
            {/* Empty for now - add any non-auth navigation items if needed */}
          </div>
        </div>
      </div>
    </nav>
  );
}
```

- [ ] **Step 5: Update server auth helper**

Update `src/server/auth.ts` to return anonymous user.

```tsx
// Replace entire file content:
export async function auth() {
  // Return anonymous user for all requests
  return {
    user: {
      id: "anonymous",
      email: null,
      name: "Anonymous User",
      image: null,
      isAdmin: false,
    },
    expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(), // 7 days
  };
}
```

- [ ] **Step 6: Update Supabase server utilities**

Update `src/lib/supabase/server.ts` to not handle authentication.

```tsx
// Replace entire file content:
// Remove all auth-related functions since we're going anonymous
export async function getUser() {
  return null;
}

export async function getSession() {
  return null;
}
```

- [ ] **Step 7: Commit dependency and import changes**

```bash
git add .
git commit -m "feat: remove Supabase auth dependencies and update imports"
```

### Task 3: Update API Routes to Remove Authentication Checks

**Files:**
- Modify: `src/app/api/presentation/generate/route.ts`
- Modify: `src/app/api/user/api-key/route.ts`
- Modify: `src/app/api/user/api-key/validate/route.ts`

- [ ] **Step 1: Update presentation generate API**

Remove auth check from `src/app/api/presentation/generate/route.ts`.

```tsx
// Remove this import:
import { auth } from "@/server/auth";

// Update POST function:
export async function POST(req: Request) {
  const requestId = crypto.randomUUID();
  const routeLogger = createLogger("api:presentation-generate");

  try {
    routeLogger.info("Presentation generation request received", { requestId });
    // Remove: const session = await auth();
    // Remove: if (!session) { ... }

    // Remove session.user.id reference in modelPicker call
    const model = await userModelPicker("anonymous", modelProvider, modelId);
    
    // Rest of function remains the same...
  }
}
```

- [ ] **Step 2: Update user API key routes**

Remove auth checks from `src/app/api/user/api-key/route.ts` and `src/app/api/user/api-key/validate/route.ts`.

For both files, remove the auth() call and session checks, allowing anonymous access to API key management.

- [ ] **Step 3: Commit API route updates**

```bash
git add .
git commit -m "feat: remove authentication checks from API routes"
```

### Task 4: Update Settings Page

**Files:**
- Modify: `src/app/settings/page.tsx`

- [ ] **Step 1: Remove authentication dependency**

The settings page currently uses API routes that require auth. Since we're making it anonymous, the API key management should work without authentication.

No changes needed if the API routes are updated properly.

- [ ] **Step 2: Commit settings page update**

```bash
git add .
git commit -m "feat: update settings page for anonymous usage"
```

### Task 5: Clean Up Environment Variables

**Files:**
- Check: `.env*` files

- [ ] **Step 1: Remove Supabase environment variables**

Remove these from `.env.local` and any other env files:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

- [ ] **Step 2: Commit environment cleanup**

```bash
git add .
git commit -m "feat: remove Supabase environment variables"
```

### Task 6: Update Database Schema (if needed)

**Files:**
- Check: `prisma/schema.prisma`

- [ ] **Step 1: Review and potentially remove user-related tables**

Check if the database schema has user tables that are no longer needed. The `getSession` function was fetching user profile data, so review if User table and related models can be removed.

- [ ] **Step 2: Commit database schema changes**

```bash
git add .
git commit -m "feat: update database schema for anonymous usage"
```

### Task 7: Test Application Functionality

**Files:**
- Run: Application tests

- [ ] **Step 1: Install dependencies without Supabase**

Run `npm install` or `pnpm install` to update dependencies.

- [ ] **Step 2: Start development server**

```bash
npm run dev
```

- [ ] **Step 3: Test key functionality**

- Verify presentation generation works without authentication
- Verify settings page loads and API key management works
- Verify navigation works without auth buttons

- [ ] **Step 4: Run tests**

```bash
npm run test
```

- [ ] **Step 5: Run linting**

```bash
npm run lint
```

- [ ] **Step 6: Commit final cleanup**

```bash
git add .
git commit -m "feat: complete Google OAuth removal and anonymous usage setup"
```

---

**Deliverables:**
- All Google OAuth authentication code removed
- Application functions without requiring user authentication
- API routes work anonymously
- Navigation and UI updated for anonymous usage
- Dependencies cleaned up
- Tests pass and linting clean</content>
<parameter name="filePath">docs/superpowers/plans/2026-05-06-remove-google-oauth.md