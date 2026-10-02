# 🚀 FINAL DEPLOYMENT CHECKLIST

## Your Supabase Project Setup

**Project ID:** Use your own Supabase project ID  
**Database URL:** Configure in Netlify environment variables  
**Anon Key:** Configure `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Netlify

---

## 📋 Step-by-Step Deployment to Netlify

### 1. Create Netlify Account & Site

1. Go to https://netlify.com and sign up (free)
2. Click "Add new site" → "Import an existing project"
3. Connect your GitHub repository
4. Configure build settings:
   - **Build command:** `pnpm build`
   - **Publish directory:** leave empty (see `netlify.toml` below)
   - **Functions directory:** `.netlify/functions`
5. Click "Deploy site"

### 2. Set Environment Variables in Netlify

After creating the site, go to **Site settings → Build & Deploy → Environment** and add these variables.

**Required** — `pnpm build` fails immediately while any of these is unset:

| Variable | Where to get it |
|----------|-----------------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk Dashboard → **API Keys** → Publishable key |
| `CLERK_SECRET_KEY` | Clerk Dashboard → **API Keys** → Secret key |
| `DATABASE_URL` | Supabase Dashboard → **Project Settings → Database** → Connection string (see the warning below) |

**Optional** — unset only disables the named feature, it never blocks the build:

| Variable | Where to get it |
|----------|-----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → **Project Settings → API** → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → **Project Settings → API** → anon / publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → **Project Settings → API** → `service_role` key |
| `OPENAI_API_KEY` | https://platform.openai.com/api-keys — **required for any AI output** |
| `CLERK_WEBHOOK_SECRET` | Clerk Dashboard → **Webhooks** → **Add Endpoint** — **required for user sync** |
| `UPLOADTHING_TOKEN` | https://app.uploadthing.com → **API Keys** |
| `API_KEY_ENCRYPTION_MASTER_KEY` | `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` (must decode to exactly 32 bytes; keep it permanent) |
| `TAVILY_API_KEY`, `TOGETHER_AI_API_KEY`, `PINECONE_API_KEY` | Respective provider dashboards |
| `UNSPLASH_ACCESS_KEY`, `PIXABAY_API_KEY`, `GIPHY_API_KEY`, `PEXELS_API_KEY` | Respective provider dashboards |
| `GOOGLE_CUSTOM_SEARCH_API_KEY` + `SEARCH_ENGINE_CX` | Google Cloud → **APIs & Services → Credentials** + Programmable Search Engine |
| `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_DSN` | Sentry → **Project → Settings → Client Keys** |

Do **not** set `SKIP_ENV_VALIDATION`. It is read directly by `src/env.js` (it is not part of
the validated schema) and setting it to `true` switches off every check, which turns a
missing Clerk key into an opaque runtime failure instead of an up-front error.

`.env.example` is the annotated template for the same list and stays in sync with `src/env.js`.

### ⚠️ `DATABASE_URL` must point at Supabase, not a local Postgres

Use the connection string from **Supabase Dashboard → Project Settings → Database**
(session mode), e.g. `postgresql://postgres.<project-ref>:<password>@db.<project-ref>.supabase.co:5432/postgres`,
or the Session-mode pooler host `aws-0-<region>.pooler.supabase.com`.

A local Postgres container cannot run these migrations: `002_users_and_trigger.sql`
references `auth.users` and creates a trigger on it, `007_rls_policies.sql` has 35 policies
calling `auth.uid()`, `009`/`010` read and delete from `auth.users`, and
`011_user_asset_storage.sql` uses `storage.buckets` / `storage.objects` /
`storage.foldername()`. `pnpm db:push` applies migrations in numeric order with no Supabase
detection, so against vanilla Postgres it aborts at `002` and every later migration silently
never runs. That is why `docker-compose.yml` ships no local Postgres container.

### ⚠️ Secrets that are not configured yet

`OPENAI_API_KEY`, `UPLOADTHING_TOKEN` and `CLERK_WEBHOOK_SECRET` are unset everywhere today.
Because they are optional in `src/env.js`, the deploy succeeds and the breakage only appears at
runtime:

| Variable | What breaks without it |
|----------|------------------------|
| `OPENAI_API_KEY` | **Every** AI generation endpoint returns **400** — no outlines, no slides, no images. The app produces nothing unless each user first adds their own key under `/settings`. |
| `UPLOADTHING_TOKEN` | Browser uploads to `/api/uploadthing` fail signature verification (the server-side `utapi` paths still work). |
| `CLERK_WEBHOOK_SECRET` | `POST /api/webhooks/clerk` returns **500**, so Clerk users are never synced into Supabase `public.users`. |

**`CLERK_WEBHOOK_SECRET` in detail.** There is no Backend API endpoint that creates this value;
it only exists as a by-product of creating a webhook endpoint in the Clerk Dashboard, and it is
displayed **once**:

1. Deploy the app so `https://<your-origin>/api/webhooks/clerk` is publicly reachable.
2. Clerk Dashboard → **Webhooks** → **Add Endpoint**.
3. Endpoint URL: `https://<your-origin>/api/webhooks/clerk`.
4. Subscribe to `user.created`, `user.updated` and `user.deleted`.
5. Copy the **Signing Secret** (`whsec_...`) shown for the new endpoint.
6. Store it as `CLERK_WEBHOOK_SECRET` and redeploy — the route reads it at module load.
7. If it is lost, delete the endpoint and create a new one; it cannot be revealed again.
8. Verify locally with `WEBHOOK_SECRET=<whsec_...> node scripts/test-webhook.mjs`.

**To get your Supabase credentials:**
1. Go to https://supabase.com/dashboard
2. Select your project (or create a new one)
3. Go to **Settings → Database** for `DATABASE_URL`
4. Go to **Settings → API** for `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**To get your Clerk credentials:**
1. Go to https://dashboard.clerk.com
2. Create a new application
3. Copy your **Publishable key** and **Secret key**

### 3. Configure Clerk Application

1. Go to Clerk Dashboard → **Configure** → **Paths**
   - Sign-in URL: `/auth/signin`
   - Sign-up URL: `/auth/signup`
   - After sign-in redirect: `/presentation`
2. Add your Netlify domain to **Allowed origins** in Clerk Dashboard
3. (Optional) Enable social providers in Clerk Dashboard → **User & Authentication** → **Social connections**
4. Create the webhook endpoint (see "Secrets that are not configured yet" above) at
   `https://<your-site.netlify.app>/api/webhooks/clerk` for `user.created`, `user.updated`,
   `user.deleted`, then store the shown signing secret as `CLERK_WEBHOOK_SECRET`

### 4. Deploy Your Site

After setting environment variables in Netlify:

1. Push an update to your `main` branch (or trigger manual deploy from Netlify dashboard)
2. Netlify will automatically build and deploy
3. Wait for build to complete (~5-10 minutes)

### 5. Run Database Migration

Once deployed, you need to create the database tables. You have two options:

**Option A: Via Netlify CLI (after deployment)**
```bash
netlify run pnpm db:push
```

**Option B: Locally on your machine** (if you have PostgreSQL client)
```bash
# Ensure your .env has the correct DATABASE_URL
pnpm db:push
```

**Option C: Via GitHub Actions CI/CD** (if configured)
The `.github/workflows/ci-cd.yml` already includes a database migration step.

### 6. Verify Deployment

Visit your Netlify URL and check:

- [ ] Homepage loads and redirects to `/presentation`
- [ ] Sign-in page accessible at `/auth/signin`
- [ ] Sign-in with Clerk works (email or social auth)
- [ ] Can create a new presentation
- [ ] Real-time generation starts (requires `OPENAI_API_KEY`, or a user-supplied key saved under `/settings` — otherwise generation returns 400)
- [ ] Can export to PPTX
- [ ] Can export to PDF
- [ ] A sign-up creates a row in Supabase `public.users` (requires the Clerk webhook endpoint and `CLERK_WEBHOOK_SECRET`)
- [ ] Health endpoint: `curl https://your-site.netlify.app/api/health` returns `{"status":"healthy"}`

---

## 📁 Important Files in Your Repository

| File | Purpose |
|------|---------|
| `DEPLOYMENT_GUIDE.md` | General deployment guide |
| `PRODUCTION_READY.md` | Feature checklist and project status |
| `README.md` | Project overview and quick start |
| `.github/workflows/ci-cd.yml` | Automated testing and deployment |
| `Dockerfile` + `docker-compose.yml` | Alternative Docker deployment |
| `netlify.toml` | Netlify-specific configuration |

---

## 🎯 Quick Commands Summary

```bash
# Verify the local environment before anything else (names only, never values).
# Use `pnpm run doctor`: pnpm >= 10 has its own built-in `doctor` command for the
# pnpm installation, and built-in commands win over package.json scripts.
pnpm run doctor

# Local development (already working)
pnpm dev

# Build for production (test locally)
pnpm build

# Run database migration against Supabase (locally or via Netlify)
pnpm db:push

# Deploy to Netlify (CLI)
netlify deploy --prod

# Check health endpoint
curl https://your-site.netlify.app/api/health
```

---

## 🔧 Configuration Files Reference

### `netlify.toml` (already present in the project root)

```toml
[build]
  base = "."
  command = "pnpm build"

[build.environment]
  NODE_VERSION = "22"
  NODE_OPTIONS = "--max-old-space-size=4096"

[dev]
  command = "pnpm dev"
  port = 3000
  targetPort = 3000
```

There is deliberately **no `publish` directory, no `@netlify/plugin-nextjs`, and no
`/api/*` redirect** in this file. `next.config.js` sets
`output: "standalone"` (the `Dockerfile` requires it), and the Netlify Next.js
plugin deploys the *default* Next.js output instead — it is not a dependency of
this repo, so declaring it would break the build. The `/api/*` redirect only
applies once the plugin is in use; with a Node runtime Next.js serves its own
`/api` routes.

### Deploying on Netlify (requires a build-output change)

```bash
# 1. Remove `output: "standalone"` from next.config.js (the Dockerfile needs it,
#    so deploy via Docker or Vercel instead if you keep it).
# 2. Add the Netlify plugin:
pnpm add -D @netlify/plugin-nextjs
# 3. In netlify.toml, set `publish = ".next"` and re-add:
#    [[redirects]]
#      from = "/api/*"
#      to = "/.netlify/functions/api/:splat"
#      status = 200
```

`packageManager` is pinned to `pnpm@10.34.6` in `package.json`; use Corepack
(`corepack enable`) so local, CI, Docker, and Netlify builds all use it.

---

## ⚠️ Important Notes

1. **Database migration must run** before using the app. Tables won't exist until you run `pnpm db:push`.

2. **Environment variables must be set** in Netlify dashboard. The build will fail without `DATABASE_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, and `CLERK_SECRET_KEY` — those are the only three the schema requires.

3. **Clerk domains must be configured** in Clerk Dashboard to include your Netlify domain.

4. **First deployment may take 10-15 minutes** due to:
   - Installing dependencies
   - Compiling TypeScript
   - Bundling for standalone output

5. **Cold starts on Netlify free tier** ~2-5 seconds. Consider upgrading to Pro for faster builds and always-on functions if needed.

---

## 🐛 Troubleshooting

### Build fails with "Cannot find module"
**Solution:** Ensure all dependencies are listed correctly in `package.json`. Avoid Node.js native modules not compatible with serverless.

### Runtime error: "DATABASE_URL not set"
**Solution:** Add `DATABASE_URL` in Netlify environment variables.

### Auth redirect loop
**Solution:** Verify `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` are set correctly. Also check that your domain is in Clerk's allowed origins.

### 404 on API routes
**Solution:** `/api/*` routes are only rewritten when `@netlify/plugin-nextjs` is
installed and `netlify.toml` declares the redirect — neither is currently true
(see above). Docker and Vercel serve `/api/*` directly and need no redirect.

### Build fails with "Invalid environment variables: { CLERK_SECRET_KEY: [ 'Required' ], ... }"
**Solution:** A required variable is missing from `.env` (locally) or from the Netlify
environment. This is almost always the git-ignored `.env` having been deleted by a
worktree reset. Run `pnpm run doctor`, which names every missing variable and where to
get it, then `cp .env.example .env` and restore the values. `pnpm install` is also
required after a reset if `node_modules/` was wiped.

### AI generation returns 400
**Solution:** `OPENAI_API_KEY` is not set. It is optional in the schema, so the build
succeeds and only generation fails. Set it (https://platform.openai.com/api-keys) or have
the user save their own key under `/settings`.

### Webhook deliveries are rejected / the endpoint returns 500
**Solution:** `CLERK_WEBHOOK_SECRET` is not set. Copy the `whsec_...` signing secret from
the Clerk Dashboard entry for `<origin>/api/webhooks/clerk` — it is only shown when the
endpoint is created, so delete and recreate the endpoint if it is lost.

### Database connection errors
**Solution:** Check that Supabase project is active, not paused. Verify connection string is correct. Ensure connection pooling is enabled in Supabase.

---

## 📞 Support

If you encounter issues:
1. Check `NETLIFY_DEPLOYMENT.md` for detailed troubleshooting
2. Review Netlify build logs in dashboard
3. Check Netlify Functions logs for runtime errors
4. Open an issue on GitHub with logs

---

**You're ready to deploy!** Just follow the steps above and your AI presentation generator will be live on Netlify in minutes. 🚀
