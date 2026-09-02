# ✅ Current Auth + Data Architecture

## What We Use Now

### Authentication: Clerk
- **Provider:** Clerk (`@clerk/nextjs`)
- **Sign-in UI:** `/auth/signin` and `/auth/signup` using Clerk components
- **Session source:** Clerk cookies/server-side `auth()` / `currentUser()`
- **Authorization data:** Clerk `publicMetadata` (`role`, `hasAccess`)
- **Files:**
  - `src/provider/ClerkAuthProvider.tsx` - client auth context
  - `src/components/AppAuthProvider.tsx` - app-level auth wrapper
  - `src/server/auth.ts` - server-side auth wrapper
  - `src/middleware.ts` - Clerk middleware with route protection

### Data: Supabase
- **Client:** `@supabase/ssr` (server) + `@supabase/supabase-js` (browser)
- **Database:** Supabase PostgreSQL with RLS policies
- **Migrations:** `supabase/migrations/*.sql`
- **Files:**
  - `src/lib/supabase/server.ts` - server-side Supabase client
  - `src/app/_actions/` - server actions using Supabase

## What Was Removed

- NextAuth (`next-auth`)
- Prisma ORM (`@prisma/client`, `prisma/`)
- Supabase Auth helpers (`@supabase/auth-helpers-react`)

## Environment Variables

```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
CLERK_WEBHOOK_SECRET="whsec_..."  # Optional: for webhook verification

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://..."
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="sb_publishable_..."
SUPABASE_SERVICE_ROLE_KEY="eyJ..."  # Optional: for server-side admin access

# Database
DATABASE_URL="postgresql://..."

# AI
OPENAI_API_KEY="sk-..."

# Encryption
API_KEY_ENCRYPTION_MASTER_KEY="..."
```

## Migration Commands

```bash
# Install dependencies
pnpm install

# Push database schema
pnpm db:push

# Run dev server
pnpm dev
```

## Notes

- Clerk manages identity and sessions
- Supabase manages data and RLS
- Authz decisions use Clerk `publicMetadata`, not Supabase `users.role`
- The `users` table still exists for Clerk user sync, but `role` / `has_access` are no longer the source of truth
