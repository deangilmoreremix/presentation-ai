# Production Deployment Guide

This guide covers deploying Presentation AI to production with Supabase and Vercel (or any other platform).

## Prerequisites

- [Supabase](https://supabase.com) account (free tier works)
- [Vercel](https://vercel.com) account (or other hosting)
- Domain (optional, for custom domain)

## Step 1: Supabase Setup

### 1.1 Create Supabase Project

1. Go to https://app.supabase.com/project/new
2. Enter project name: `presentation-ai` (or your choice)
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

### 1.3 (Optional) Enable Google OAuth in Supabase

If you want users to sign in with Google:

1. Go to **Authentication** → **Providers**
2. Click on **Google**
3. Toggle "Enable" to ON
4. Copy the **Client ID** and **Client Secret** from Google Cloud Console
   - Go to https://console.cloud.google.com/apis/credentials
   - Create OAuth 2.0 Client ID (Web application)
   - Add authorized redirect URI: `https://[YOUR-PROJECT-ID].supabase.co/auth/v1/callback`
   - Save the credentials
5. Paste into Supabase Google provider settings
6. Save

### 1.4 Run Database Migration

```bash
# Install dependencies if not already
pnpm install

# Push Prisma schema to Supabase
pnpm db:push
```

This creates all necessary tables:

- `Account`, `User`, `Session` (for NextAuth)
- `BaseDocument`, `Presentation`
- `PresentationTheme`, `FavoritePresentationTheme`, `PresentationThemeLike`
- `FontPair`, `GeneratedImage`, `FavoriteDocument`

## Step 2: Environment Variables Configuration

Create a `.env` file (or set in your hosting platform):

```env
# ── Database ────────────────────────────────────────────────────────
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-ID].supabase.co:5432/postgres"

# ── Supabase (for client-side auth if needed) ───────────────────────
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT-ID].supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="sb_publishable_..."

# ── NextAuth Configuration ─────────────────────────────────────────
NEXTAUTH_SECRET="$(openssl rand -base64 32)"   # Generate secure random string
NEXTAUTH_URL="https://your-app.vercel.app"     # Your production URL

# ── Google OAuth (if using) ────────────────────────────────────────
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# ── AI Providers (optional but recommended) ─────────────────────────
OPENAI_API_KEY="sk-your-openai-key"

# ── Optional Services ───────────────────────────────────────────────
UNSPLASH_ACCESS_KEY="your-unsplash-key"     # For stock images
TAVILY_API_KEY="your-tavily-key"            # For web search
# UPLOADTHING_TOKEN not needed unless using UploadThing for file uploads
```

**Generate NEXTAUTH_SECRET:**

```bash
# On Unix/macOS:
openssl rand -base64 32

# On Windows (PowerShell):
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

## Step 3: Local Testing (Before Deploy)

```bash
# 1. Ensure env vars are set
cp .env.example .env
# Edit .env with your actual values

# 2. Install deps
pnpm install

# 3. Push database schema
pnpm db:push

# 4. Run dev server
pnpm dev

# 5. Test manually:
#    - Visit http://localhost:3000
#    - Click "Sign in with Google"
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
# - Project name: presentation-ai
# - Directory: ./
# - Want to modify settings? No
```

After first deploy, configure environment variables in Vercel dashboard:

1. Go to https://vercel.com/[your-org]/presentation-ai/settings/environment-variables
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

### 5.2 Set Up Auth Callback URLs

In Supabase → Authentication → URL Configuration:

```
Site URL: https://your-app.vercel.app
Redirect URLs: https://your-app.vercel.app/auth/callback/*
```

### 5.3 Google OAuth (if using)

In Google Cloud Console → Credentials:

1. Edit your OAuth 2.0 client
2. Add authorized redirect URI:
   ```
   https://YOUR-PROJECT-ID.supabase.co/auth/v1/callback
   ```
3. Save

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

### Docker (Self-Hosted)

```bash
# Build image
docker build -t presentation-ai .

# Run with environment variables
docker run -d \
  -p 3000:3000 \
  -e DATABASE_URL="..." \
  -e NEXTAUTH_SECRET="..." \
  -e NEXTAUTH_URL="..." \
  -e GOOGLE_CLIENT_ID="..." \
  -e GOOGLE_CLIENT_SECRET="..." \
  -e OPENAI_API_KEY="..." \
  presentation-ai
```

Or with Docker Compose (includes PostgreSQL):

```bash
# Edit docker-compose.yml with your environment variables
# Then:
docker-compose up -d
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

- Session storage (NextAuth)
- API response caching
- Rate limit counters across instances

## Step 9: Security Checklist

Before going live:

- [x] HTTPS enforced (Vercel provides automatically)
- [x] Environment variables secured (not in client bundle)
- [x] Rate limiting enabled (Done in proxy.ts)
- [x] Database connections use SSL (Supabase enforces)
- [x] NextAuth uses secure cookies (default)
- [x] CSRF protection (NextAuth provides)
- [ ] Add Content Security Policy headers
- [ ] Set up HSTS headers
- [ ] Enable audit logging in Supabase
- [ ] Regularly rotate API keys

## Step 10: Custom Domain (Optional)

1. In Vercel dashboard → Domains
2. Add your domain (e.g., `presentations.yourcompany.com`)
3. Follow DNS configuration instructions (update DNS records)
4. Wait for SSL certificate (automatic via Let's Encrypt)
5. Update `NEXTAUTH_URL` to use your custom domain

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

**Solution:** This typically means NEXTAUTH_URL is not set correctly. Ensure it matches your production domain exactly (including https://).

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

**🎉 Congratulations! Your Presentation AI is now live and ready for thousands of users.**

Need help? Open an issue on GitHub or join our Discord community.
