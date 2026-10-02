# Production Deployment Guide

This guide covers deploying Smart Presentations to production with Supabase and Vercel (or any other platform).

## Prerequisites

- [Supabase](https://supabase.com) account (free tier works)
- [Vercel](https://vercel.com) account (or other hosting)
- Domain (optional, for custom domain)

## Step 1: Supabase Setup

### 1.1 Create Supabase Project

1. Go to https://app.supabase.com/project/new
2. Enter project name: `smart-presentations` (or your choice)
3. Select region closest to your users
4. Choose Free tier
5. Click "Create new project"
6. Wait for database to be provisioned (2-3 minutes)

### 1.2 Get Database Connection String

1. In Supabase dashboard, go to **Project Settings** (gear icon) → **Database**
2. Scroll to **Connection Pooling** section
3. Select **Session** mode (for server-side apps)
4. Copy the **Connection string** (it looks like: `postgresql://postgres:[PASSWORD]@db.[PROJECT-ID].supabase.co:5432/postgres`)
5. Save this as `DATABASE_URL` in your environment variables

⚠️ **Important:** Use the password shown in Supabase, not your actual database password. Supabase generates a secure password for you.

⚠️ **`DATABASE_URL` must point at the Supabase project, never at a local Postgres
container.** The migrations in `supabase/migrations/` depend on Supabase internals:
`002_users_and_trigger.sql` references `auth.users` and creates a trigger on it,
`007_rls_policies.sql` contains 35 RLS policies calling `auth.uid()`,
`009`/`010` read and delete rows in `auth.users`, and
`011_user_asset_storage.sql` uses `storage.buckets` / `storage.objects` /
`storage.foldername()`. `pnpm db:push` applies migrations in numeric order with no
Supabase detection, so against vanilla Postgres it aborts at `002` and every later
migration silently never runs. This is also why `docker-compose.yml` ships no local
Postgres container. Use the direct host (`db.<project-ref>.supabase.co`) or the
Session-mode pooler host (`aws-0-<region>.pooler.supabase.com`).

### 1.3 Clerk Authentication Setup

1. Go to https://dashboard.clerk.com and create an account
2. Create a new application
3. In **API Keys**, copy your **Publishable Key** and **Secret Key**
4. Configure your Clerk application:
   - Add your production domain to **Allowed origins**
   - Configure redirect URLs to match your app
   - Enable email/password sign-in (or social providers as needed)

`CLERK_WEBHOOK_SECRET` is *not* available here — see Step 5.2.

### 1.4 Run Database Migrations

```bash
# Verify the environment first (names only, never values). Use `pnpm run doctor`:
# pnpm >= 10 has its own built-in `doctor` command and built-ins win over scripts.
pnpm run doctor

# Install dependencies if not already
pnpm install

# Push Supabase migrations to your Supabase project
pnpm db:push
```

`pnpm db:push` needs `psql` and `DATABASE_URL` pointing at the Supabase project (see
Step 1.2). The Supabase CLI is the supported alternative and skips the local `psql`
dependency:

```bash
supabase link --project-ref <project-ref>
supabase db push
```

This creates all necessary tables:

- `base_documents`, `presentations`
- `presentation_themes`, `favorite_presentation_themes`, `presentation_theme_likes`
- `font_pairs`, `generated_images`, `favorite_documents`
- `users` (for Clerk user sync and role-based access)

## Step 2: Environment Variables Configuration

`.env.example` is the committed, annotated template and is kept in sync with the schema
in `src/env.js` — prefer it over any hand-written list. Create a local `.env` with
`cp .env.example .env`, fill in the three required values, and run `pnpm run doctor` to
confirm nothing is missing. In production, set the same names in your hosting platform.

```env
# ── Clerk Authentication ────────────────────────────────────────────
# [REQUIRED] Clerk Dashboard -> API Keys
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."

# [OPTIONAL] Clerk Dashboard -> Webhooks -> Add Endpoint. Shown once, at creation.
# Without it POST /api/webhooks/clerk returns 500 and users are never synced
# into Supabase. See Step 5.2 — no API can create this value.
CLERK_WEBHOOK_SECRET="whsec_..."

# ── Supabase ────────────────────────────────────────────────────────
# [OPTIONAL] Supabase Dashboard -> Project Settings -> API
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT-ID].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="sb_publishable_..."
SUPABASE_SERVICE_ROLE_KEY="eyJ..."  # server-side admin access; bypasses RLS

# ── Database ────────────────────────────────────────────────────────
# [REQUIRED] Supabase Dashboard -> Project Settings -> Database.
# Must be the Supabase project host, never a local Postgres container (Step 1.2).
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-ID].supabase.co:5432/postgres"

# ── AI Providers ────────────────────────────────────────────────────
# [OPTIONAL but required for any AI output] https://platform.openai.com/api-keys
# Without OPENAI_API_KEY every generation endpoint returns 400; the only
# remaining path is a user-supplied key saved under /settings.
OPENAI_API_KEY="sk-your-openai-key"
TOGETHER_AI_API_KEY=""   # [OPTIONAL]
PINECONE_API_KEY=""      # [OPTIONAL]
TAVILY_API_KEY=""        # [OPTIONAL]

# ── Encryption ──────────────────────────────────────────────────────
# [OPTIONAL] Encrypts per-user OpenAI keys stored server-side. Must decode to
# exactly 32 bytes (64-char hex is also accepted). Generate with:
#   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
# Keep it permanent: rotating it makes stored user keys undecryptable.
API_KEY_ENCRYPTION_MASTER_KEY="..."

# ── Uploads ─────────────────────────────────────────────────────────
# [OPTIONAL] https://app.uploadthing.com -> API Keys
UPLOADTHING_TOKEN="your-uploadthing-token"

# ── Error Tracking ──────────────────────────────────────────────────
# [OPTIONAL] Sentry -> Project -> Settings -> Client Keys
NEXT_PUBLIC_SENTRY_DSN=""
SENTRY_DSN=""

# ── Media Search ────────────────────────────────────────────────────
UNSPLASH_ACCESS_KEY=""   # [OPTIONAL]
PIXABAY_API_KEY=""       # [OPTIONAL]
GIPHY_API_KEY=""         # [OPTIONAL]
PEXELS_API_KEY=""        # [OPTIONAL]
GOOGLE_CUSTOM_SEARCH_API_KEY=""  # [OPTIONAL]
SEARCH_ENGINE_CX=""      # [OPTIONAL]

# ── Runtime ─────────────────────────────────────────────────────────
# [OPTIONAL] development | test | production — defaults to "development".
NODE_ENV=""
```

Only `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` and `DATABASE_URL` are
required by the schema; everything else is `.optional()` or defaulted. Never set
`SKIP_ENV_VALIDATION` in production: it is read outside the schema and disables every
check, converting a missing required variable into an opaque runtime failure.

## Step 3: Local Testing (Before Deploy)

```bash
# 1. Ensure env vars are set
cp .env.example .env
# Edit .env with your actual values

# 2. Confirm nothing is missing before building. Prints variable names only,
#    never values. (`pnpm run doctor` — pnpm >= 10 shadows `pnpm doctor` with its
#    own installation check.)
pnpm run doctor

# 3. Install deps
pnpm install

# 4. Push database schema to Supabase
pnpm db:push

# 5. Run dev server (binds to 3000; override with PORT=3001 pnpm dev)
pnpm dev

# 6. Test manually:
#    - Visit http://localhost:3000
#    - Sign in with Clerk (email or social auth)
#    - Create a presentation
#    - Export as PPTX and PDF
```

## Step 4: Deploy to Vercel (Recommended)

### Option A: Via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy (first time)
vercel --prod

# Follow prompts:
# - Link to existing project? No (create new)
# - Project name: smart-presentations
# - Directory: ./
# - Want to modify settings? No
```

After first deploy, configure environment variables in Vercel dashboard:

1. Go to https://vercel.com/[your-org]/smart-presentations/settings/environment-variables
2. Add all variables from Step 2
3. Redeploy for changes to take effect

### Option B: Via GitHub Integration

1. Push code to GitHub repository
2. Go to https://vercel.com/new
3. Import your GitHub repo
4. Configure:
   - Framework Preset: Next.js
   - Root Directory: ./
   - Build Command: `pnpm build`
   - Output Directory: `.next`
5. Add environment variables (same as Step 2)
6. Click "Deploy"

## Step 5: Post-Deployment Configuration

### 5.1 Database Connection Pooling (Important for Production)

Supabase has connection limits. To avoid exceeding limits:

1. In Supabase Dashboard → Database → Connection Pooling
2. Set **Max client connections** to your plan's limit:
   - Free tier: 10-15 connections
   - Pro tier: 50-100 connections
3. Enable **Prepare transactions** (helps with performance)
4. Copy the new connection string and update `DATABASE_URL` if changed

### 5.2 Set Up Clerk Application

In Clerk Dashboard → **Configure** → **Paths**:

- **Sign-in URL**: `/auth/signin`
- **Sign-up URL**: `/auth/signup`
- **After sign-in redirect**: `/presentation`
- **After sign-up redirect**: `/presentation`

Also configure:

1. **Social providers** (optional): Enable Google, GitHub, etc. in Clerk Dashboard → **User & Authentication** → **Social connections**
2. **Email verification**: Configure in Clerk Dashboard → **User & Authentication** → **Email**
3. **Webhooks**: required for Clerk → Supabase user sync (it is what writes `public.users` rows)
   - Webhook URL: `https://your-app.vercel.app/api/webhooks/clerk`
   - Events: `user.created`, `user.updated`, `user.deleted`
   - Copy the `whsec_...` **Signing Secret** that Clerk displays when the endpoint is created and store it as `CLERK_WEBHOOK_SECRET`. There is **no Backend API endpoint that creates this value**, and it is shown only once — if it is lost, delete the endpoint and create a new one.

### 5.3 Clerk Webhook Verification

`src/app/api/webhooks/clerk/route.ts` verifies every delivery with Svix and returns 400 on
a bad signature, so the endpoint is safe to expose. What it needs from you is the
`CLERK_WEBHOOK_SECRET` obtained in Step 5.2; with the variable unset the route returns 500
before it ever looks at the payload:

```typescript
// src/app/api/webhooks/clerk/route.ts (abridged)
import { Webhook } from "svix";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return NextResponse.json({ error: "CLERK_WEBHOOK_SECRET is not configured" }, { status: 500 });
  }

  const svix = new Webhook(webhookSecret);
  // ... verify(payload, headers) -> 400 on an invalid signature,
  // ... then sync the user row into Supabase `public.users`.
}
```

Verify a delivery end to end once the app is deployed:

```bash
WEBHOOK_SECRET=<whsec_...> node scripts/test-webhook.mjs
```

## Step 6: Deploy to Other Platforms

### Railway

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Choose "Deploy existing project"
# Select "Node.js"
# Set build command: pnpm build
# Set start command: pnpm start

# Add environment variables via Railway dashboard
# Deploy
railway up
```

### Docker Deployment

```bash
# Build image
docker build -t smart-presentations .

# Run with environment variables
docker run -d \
  -p 3000:3000 \
  -e NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="..." \
  -e CLERK_SECRET_KEY="..." \
  -e CLERK_WEBHOOK_SECRET="..." \
  -e NEXT_PUBLIC_SUPABASE_URL="..." \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY="..." \
  -e SUPABASE_SERVICE_ROLE_KEY="..." \
  -e DATABASE_URL="..." \
  -e OPENAI_API_KEY="..." \
  -e UPLOADTHING_TOKEN="..." \
  -e API_KEY_ENCRYPTION_MASTER_KEY="..." \
  smart-presentations
```

Or with Docker Compose:

```bash
# docker-compose.yml builds the same image and takes its variables from the
# shell environment (a local .env is read automatically). It ships NO local
# Postgres container: DATABASE_URL must be the Supabase project connection
# string, because the migrations cannot run on vanilla Postgres (Step 1.2).
# The three schema-required variables use ${VAR:?...} so compose fails fast
# with an actionable message instead of booting half-configured.
docker compose up -d
```

## Step 7: Monitoring & Maintenance

### 7.1 Health Checks

The app provides `/api/health` endpoint:

```bash
curl https://your-app.vercel.app/api/health
```

Expected response:

```json
{
  "status": "healthy",
  "timestamp": "2025-05-03T02:00:00.000Z",
  "uptime": 1234.56,
  "version": "0.1.0",
  "environment": "production",
  "database": "connected"
}
```

Set up uptime monitoring (UptimeRobot, Pingdom, etc.) to hit this endpoint every 1-5 minutes.

### 7.2 Error Monitoring (Recommended)

Add Sentry for error tracking:

1. Create Sentry account
2. Install Sentry Next.js SDK:
   ```bash
   pnpm add @sentry/nextjs
   ```
3. Follow Sentry's Next.js setup guide
4. Set `SENTRY_DSN` environment variable

### 7.3 Database Backups

Supabase automatically:

- Takes daily backups (kept for 7 days on free tier)
- Allows point-in-time recovery

For longer retention, set up periodic exports:

```bash
# Use Supabase CLI to export
supabase db dump --project-ref YOUR_PROJECT_ID > backup.sql
```

### 7.4 Performance Monitoring

Use Vercel Analytics (free) to monitor:

- Page load times
- Core Web Vitals
- Visitor locations

## Step 8: Scaling Considerations

When your user base grows:

### Database Scaling

- Upgrade Supabase plan (Pro → Enterprise)
- Enable read replicas for heavy read workloads
- Add indexes for frequently queried fields (already done for key fields)

### Application Scaling

- Vercel automatically scales horizontally
- Functions timeouts: increase if AI generation takes longer
- Consider edge functions for non-database operations

### Rate Limiting

Current config in `src/proxy.ts`:

```typescript
maxRequests: isAIGeneration ? 5 : 30, // per minute per IP
```

Adjust based on your plan limits and user behavior.

### Caching

Add Redis for:

- API response caching
- Rate limit counters across instances
- Session caching (Clerk handles sessions internally)

## Step 9: Security Checklist

Before going live:

- [x] HTTPS enforced (Vercel provides automatically)
- [x] Environment variables secured (not in client bundle)
- [x] Rate limiting enabled
- [x] Database connections use SSL (Supabase enforces)
- [x] Clerk sessions use secure cookies (default)
- [x] CSRF protection on mutation routes
- [ ] Add Content Security Policy headers
- [ ] Set up HSTS headers
- [ ] Enable audit logging in Supabase
- [ ] Regularly rotate API keys
- [ ] Configure Clerk webhook signature verification (if using webhooks)

## Step 10: Custom Domain (Optional)

1. In Vercel dashboard → Domains
2. Add your domain (e.g., `presentations.yourcompany.com`)
3. Follow DNS configuration instructions (update DNS records)
4. Wait for SSL certificate (automatic via Let's Encrypt)
5. Update your Clerk application domains to include the custom domain
6. Update `NEXT_PUBLIC_APP_URL` environment variable

## Step 11: CI/CD Pipeline (GitHub Actions)

Already configured in `.github/workflows/ci-cd.yml`:

- ✅ Type checking on every PR
- ✅ Linting on every PR
- ✅ Build verification
- ✅ Auto-deploy to Vercel on main branch pushes

To use:

1. Fork this repo or use your own
2. Connect GitHub repo to Vercel (Vercel will auto-detect workflow)
3. Set `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` as GitHub secrets

## Troubleshooting

### Build Fails with "Cannot find module"

**Problem:** Native modules not building for serverless.

**Solution:** Ensure all dependencies are listed correctly in `package.json`. Avoid Node.js native modules not compatible with serverless.

### Database Connection Errors

**Problem:** `P3007` or connection timeout.

**Solution:**

- Check `DATABASE_URL` is correct
- Ensure Supabase project is not paused
- Check connection limit reached (upgrade plan)
- Add connection pooling (connection string includes `?pgbouncer=true`)

### Auth Redirect Loops

**Problem:** Getting caught in redirect loop between `/` → `/presentation` → `/auth/signin` → `/`

**Solution:** This typically means Clerk session is not being properly maintained. Ensure:

1. `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` are set correctly
2. Clerk middleware is configured in `src/proxy.ts`
3. Your domain is added to Clerk's allowed origins

### Rate Limits Too Aggressive

**Problem:** Legitimate users getting 429 errors.

**Solution:** Adjust limits in `src/proxy.ts`:

```typescript
maxRequests: isAIGeneration ? 10 : 50, // increase as needed
```

### Export Fails

**Problem:** PPTX/PDF export produces blank or broken files.

**Solution:**

- Ensure all slides are visible in DOM (not lazy-loaded outside viewport)
- Check browser console for errors during export
- Verify `html-to-image` library loaded correctly
- Large presentations may need more memory; consider splitting into batches

## Step 12: Going Live

Final checklist:

- [ ] All environment variables set in production
- [ ] Database migrated and seeded (if needed)
- [ ] HTTPS working (automatic on Vercel)
- [ ] Custom domain configured (if using)
- [ ] Google OAuth working (test sign-in)
- [ ] Create test presentation, export both formats
- [ ] Health endpoint returns `{"status":"healthy"}`
- [ ] Error monitoring (Sentry) configured
- [ ] Analytics (Vercel Analytics) enabled
- [ ] Rate limits appropriate for expected traffic
- [ ] Backup strategy in place
- [ ] Team members trained on deployment process

---

**🎉 Congratulations! Your Smart Presentations app is now live and ready for thousands of users.**

Need help? Open an issue on GitHub or join our Discord community.
