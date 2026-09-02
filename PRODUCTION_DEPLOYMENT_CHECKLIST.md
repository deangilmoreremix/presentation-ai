# Production Deployment Checklist

Use this checklist when deploying Smart Presentations to a real environment.
Each item is tied to the current codebase state as of the latest cleanup.

## Pre-Deployment Verification

### Code & Configuration
- [ ] `pnpm type` passes cleanly
- [ ] `pnpm lint` passes cleanly
- [ ] `pnpm test:unit` passes cleanly
- [ ] `pnpm build` succeeds in a memory-sufficient environment (>=4GB RAM)
- [ ] No references to `NextAuth`, `next-auth`, `@prisma/client`, `SupabaseAuthProvider`, or `supabase-provider` remain in `src/`
- [ ] `.env.example` matches the required production variables

### Required Environment Variables

Set these in your hosting platform (Vercel, Netlify, Docker, etc.):

- [ ] `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- [ ] `CLERK_SECRET_KEY`
- [ ] `CLERK_WEBHOOK_SECRET` (if using webhooks)
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` (optional but recommended)
- [ ] `DATABASE_URL`
- [ ] `OPENAI_API_KEY`
- [ ] `API_KEY_ENCRYPTION_MASTER_KEY`
- [ ] `UNSPLASH_ACCESS_KEY` (optional)
- [ ] `TAVILY_API_KEY` (optional)
- [ ] `UPLOADTHING_TOKEN` (optional)
- [ ] `NEXT_PUBLIC_SENTRY_DSN` (optional)
- [ ] `SENTRY_DSN` (optional)

### Clerk Configuration

- [ ] Clerk application is created at https://dashboard.clerk.com
- [ ] Production domain is added to **Allowed origins** in Clerk Dashboard
- [ ] Sign-in path: `/auth/signin`
- [ ] Sign-up path: `/auth/signup`
- [ ] After sign-in redirect: `/presentation`
- [ ] After sign-up redirect: `/presentation`
- [ ] Social providers configured if needed (Google, GitHub, etc.)
- [ ] Webhook endpoint configured (if using): `https://your-app.com/api/webhooks/clerk`
- [ ] `CLERK_WEBHOOK_SECRET` is set and matches the webhook secret in Clerk Dashboard

### Supabase Configuration

- [ ] Supabase project is created and active
- [ ] `NEXT_PUBLIC_SUPABASE_URL` matches project URL
- [ ] `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is set
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is set (for server-side admin access)
- [ ] `DATABASE_URL` is set and connection pooling is configured
- [ ] Database migrations are applied: `pnpm db:push`
- [ ] RLS policies are active (see `supabase/migrations/007_rls_policies.sql`)
- [ ] Anonymous user row exists in `public.users` with `role = 'USER'` and `has_access = false`

### Sentry Configuration (Optional but Recommended)

- [ ] Sentry project is created
- [ ] `NEXT_PUBLIC_SENTRY_DSN` is set
- [ ] `SENTRY_DSN` is set
- [ ] Source maps are uploaded during build (Sentry Next.js SDK handles this automatically)

## Post-Deployment Verification

### Health & Auth
- [ ] `GET /api/health` returns `{"status":"healthy","database":"connected"}`
- [ ] `GET /` loads without errors
- [ ] `GET /presentation` redirects to `/auth/signin` when not authenticated
- [ ] Sign-in flow works end-to-end
- [ ] After sign-in, user is redirected to `/presentation`
- [ ] Sign-out flow works

### Core Features
- [ ] Can create a new presentation
- [ ] Can generate an AI outline
- [ ] Can generate full presentation from outline
- [ ] Can edit slides in the Plate.js editor
- [ ] Can export to PPTX
- [ ] Can export to PDF
- [ ] Image generation works (if OpenAI key is configured)
- [ ] Theme selection and customization works

### API & Security
- [ ] Rate limiting is active (test with rapid requests to `/api/health`)
- [ ] CSRF protection is active (test POST to `/api/ai/copilot` without origin header)
- [ ] Security headers are present:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `X-XSS-Protection: 1; mode=block`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
  - `Strict-Transport-Security` in production
- [ ] Clerk webhook endpoint returns 400 for invalid signatures (test with `svix` CLI or curl)

### CI/CD
- [ ] GitHub Actions workflow is triggered on PR
- [ ] Type-check job passes
- [ ] Lint job passes
- [ ] Unit tests job passes
- [ ] Build job passes
- [ ] Deploy job runs on merge to `main` (if configured)

## Rollback Plan

If deployment fails:

1. **Vercel**: Rollback to previous deployment from Vercel dashboard
2. **Netlify**: Rollback to previous deploy from Netlify dashboard
3. **Docker**: redeploy previous image tag
4. **Database**: `pnpm db:push` is idempotent; re-run if migrations failed mid-apply

## Known Limitations

- Full `pnpm build` requires >=4GB RAM; CI runners should specify `NODE_OPTIONS="--max-old-space-size=4096"`
- Anonymous users can read public content but cannot create/edit presentations unless signed in
- `users.role` and `users.has_access` columns are deprecated; authz now uses Clerk `publicMetadata`
- PPTX/PDF export requires all slides to be visible in the DOM at export time
