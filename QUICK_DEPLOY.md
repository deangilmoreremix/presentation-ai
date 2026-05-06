# 🚀 FINAL DEPLOYMENT CHECKLIST

## Your Supabase Project is Ready

**Project ID:** `bzxohkrxcwodllketcpz`  
**Database URL:** `postgresql://postgres:VideoRemix2026@db.bzxohkrxcwodllketcpz.supabase.co:5432/postgres`  
**Anon Key:** Already in your `.env` as `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

---

## 📋 Step-by-Step Deployment to Netlify

### 1. Create Netlify Account & Site

1. Go to https://netlify.com and sign up (free)
2. Click "Add new site" → "Import an existing project"
3. Connect your GitHub repository: `deangilmoreremix/presentation-ai`
4. Configure build settings:
   - **Build command:** `pnpm build`
   - **Publish directory:** `.next/standalone`
   - **Functions directory:** `.netlify/functions`
5. Click "Deploy site"

### 2. Set Environment Variables in Netlify

After creating the site, go to **Site settings → Build & Deploy → Environment** and add these variables:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | `postgresql://postgres:VideoRemix2026@db.bzxohkrxcwodllketcpz.supabase.co:5432/postgres` |
| `NEXTAUTH_SECRET` | `ICsHeY100hVbnUUIuBwbcPx2nCeFr6wr/eUKx+bC/58=` |
| `NEXTAUTH_URL` | **Your Netlify site URL** (e.g., `https://your-site.netlify.app`) - set this AFTER you get your Netlify URL |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://bzxohkrxcwodllketcpz.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_-CX9glOjtolD9mPJqjHlaQ_bFxkQZn6` |
| `SKIP_ENV_VALIDATION` | `true` |

**Optional (for AI features):**
| Variable | Value |
|----------|-------|
| `OPENAI_API_KEY` | Your OpenAI API key (if you have one) |

**Note:** `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are NOT needed if you use Supabase Auth. Configure Google OAuth in Supabase dashboard instead.

### 3. Enable Google OAuth in Supabase (Optional but Recommended)

1. Go to Supabase dashboard → **Authentication** → **Providers**
2. Click **Google**
3. Toggle **Enable** to ON
4. You'll need to create a Google Cloud OAuth app:
   - Go to https://console.cloud.google.com/apis/credentials
   - Create OAuth 2.0 Client ID (Web application)
   - Add authorized redirect URI: `https://bzxohkrxcwodllketcpz.supabase.co/auth/v1/callback/google`
   - Copy Client ID and Client Secret
   - Paste into Supabase Google provider settings
5. Save

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

### 6. Update NEXTAUTH_URL

After you get your Netlify site URL (e.g., `https://presentation-ai.netlify.app`):

1. Go to Netlify dashboard → Site settings → Build & Deploy → Environment
2. Update `NEXTAUTH_URL` to your actual Netlify URL
3. Redeploy the site (or trigger a new build)

### 7. Verify Deployment

Visit your Netlify URL and check:

- [ ] Homepage loads and redirects to `/presentation`
- [ ] Sign-in page accessible at `/auth/signin`
- [ ] Sign-in with Google works (if configured)
- [ ] Can create a new presentation
- [ ] Real-time generation starts
- [ ] Can export to PPTX
- [ ] Can export to PDF
- [ ] Health endpoint: `curl https://your-site.netlify.app/api/health` returns `{"status":"healthy"}`

---

## 📁 Important Files in Your Repository

| File | Purpose |
|------|---------|
| `NETLIFY_DEPLOYMENT.md` | Detailed Netlify-specific deployment guide |
| `DEPLOYMENT_GUIDE.md` | General deployment guide (Netlify vs Vercel comparison) |
| `PRODUCTION_READY.md` | Full feature checklist and project status |
| `README.md` | Project overview and quick start |
| `netlify.toml` (you need to create) | Build configuration for Netlify |
| `.github/workflows/ci-cd.yml` | Automated testing and deployment |
| `Dockerfile` + `docker-compose.yml` | Alternative Docker deployment |

---

## 🎯 Quick Commands Summary

```bash
# Local development (already working)
pnpm dev

# Build for production (test locally)
pnpm build

# Run database migration (locally or via Netlify)
pnpm db:push

# Deploy to Netlify (CLI)
netlify deploy --prod

# Check health endpoint
curl https://your-site.netlify.app/api/health
```

---

## 🔧 Configuration Files Reference

### `netlify.toml` (create this in project root)

```toml
[build]
  command = "pnpm build"
  publish = ".next/standalone"
  [build.environment]
    NODE_VERSION = "18"
    NPM_VERSION = "10"
    NODE_OPTIONS = "--max-old-space-size=4096"

[dev]
  command = "pnpm dev"
  port = 3000
  targetPort = 3000
  publish = ".next/standalone"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/api/:splat"
  status = 200
```

### Netlify Plugin (Recommended)

```bash
pnpm add -D @netlify/plugin-nextjs
```

This plugin automatically handles Next.js routing and serverless functions.

---

## ⚠️ Important Notes

1. **Database migration must run** before using the app. Tables won't exist until you run `pnpm db:push`.

2. **Environment variables must be set** in Netlify dashboard. The build will fail without `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`.

3. **NEXTAUTH_URL must match** your Netlify site URL exactly (including https://). If it doesn't match, Google OAuth will fail.

4. **Google OAuth redirect URIs** must include both:
   - `https://your-site.netlify.app/api/auth/callback/google`
   - `https://bzxohkrxcwodllketcpz.supabase.co/auth/v1/callback/google` (for Supabase)

5. **First deployment may take 10-15 minutes** due to:
   - Installing dependencies
   - Building Prisma client
   - Compiling TypeScript
   - Bundling for standalone output

6. **Cold starts on Netlify free tier** ~2-5 seconds. Consider upgrading to Pro for faster builds and always-on functions if needed.

---

## 🐛 Troubleshooting

### Build fails with "Prisma schema not found"
**Solution:** Ensure `postinstall` script exists in `package.json`: `"postinstall": "prisma generate"`

### Runtime error: "DATABASE_URL not set"
**Solution:** Add `DATABASE_URL` in Netlify environment variables.

### Auth redirect loop
**Solution:** Verify `NEXTAUTH_URL` matches your Netlify URL exactly. Also check callback URLs in Google Cloud Console.

### 404 on API routes
**Solution:** Ensure `netlify.toml` has the redirect rule and `@netlify/plugin-nextjs` is installed.

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
