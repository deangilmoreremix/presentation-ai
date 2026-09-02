# 🚀 FINAL DEPLOYMENT CHECKLIST

## Your Supabase Project Setup

**Project ID:** Use your own Supabase project ID  
**Database URL:** Configure in Netlify environment variables  
**Anon Key:** Configure `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in Netlify

---

## 📋 Step-by-Step Deployment to Netlify

### 1. Create Netlify Account & Site

1. Go to https://netlify.com and sign up (free)
2. Click "Add new site" → "Import an existing project"
3. Connect your GitHub repository
4. Configure build settings:
   - **Build command:** `pnpm build`
   - **Publish directory:** `.next/standalone`
   - **Functions directory:** `.netlify/functions`
5. Click "Deploy site"

### 2. Set Environment Variables in Netlify

After creating the site, go to **Site settings → Build & Deploy → Environment** and add these variables:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Your Clerk publishable key |
| `CLERK_SECRET_KEY` | Your Clerk secret key |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Your Supabase publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key (optional) |
| `DATABASE_URL` | Your Supabase PostgreSQL connection string |
| `OPENAI_API_KEY` | Your OpenAI API key (if you have one) |
| `API_KEY_ENCRYPTION_MASTER_KEY` | Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `SKIP_ENV_VALIDATION` | `true` |

**To get your Supabase credentials:**
1. Go to https://supabase.com/dashboard
2. Select your project (or create a new one)
3. Go to **Settings → Database** for `DATABASE_URL`
4. Go to **Settings → API** for `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

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
- [ ] Real-time generation starts
- [ ] Can export to PPTX
- [ ] Can export to PDF
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

2. **Environment variables must be set** in Netlify dashboard. The build will fail without `DATABASE_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, and `CLERK_SECRET_KEY`.

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
