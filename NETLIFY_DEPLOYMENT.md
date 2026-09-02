# Netlify Deployment Guide

This guide covers deploying Smart Presentations to Netlify with Supabase.

## Step 1: Create `netlify.toml`

Create this file in your project root:

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

## Step 2: Add Netlify Next.js Plugin (Recommended)

```bash
pnpm add -D @netlify/plugin-nextjs
```

This plugin automatically handles Next.js routing and serverless functions.

## Step 3: Deploy to Netlify

### Via Git Integration:

1. Push your code to GitHub
2. Go to https://app.netlify.com/sites/new
3. Import from Git → select your repository
4. Build settings:
   - **Build command:** `pnpm build`
   - **Publish directory:** `.next/standalone`
   - **Functions directory:** `.netlify/functions`
5. Set environment variables (see below)
6. Click "Deploy site"

### Via Netlify CLI:

```bash
npm install -g netlify-cli
netlify login
netlify init
# Follow prompts to create new site
netlify deploy --prod
```

## Step 4: Environment Variables

In Netlify dashboard → Site settings → Build & Deploy → Environment:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT-ID].supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="sb_publishable_..."
SUPABASE_SERVICE_ROLE_KEY="eyJ..."  # Optional
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-ID].supabase.co:5432/postgres"
OPENAI_API_KEY="sk-..." # optional
API_KEY_ENCRYPTION_MASTER_KEY="..."
SKIP_ENV_VALIDATION=true
```

## Step 5: Post-Deploy

1. **Run database migration:**
   ```bash
   netlify run pnpm db:push
   ```

2. **Configure Clerk:**
   - Add your Netlify domain to Clerk Dashboard → Configure → Allowed origins
   - Set redirect paths: sign-in `/auth/signin`, sign-up `/auth/signup`

3. **Test the deployed site:**
   - Visit your Netlify URL
   - Sign in with Clerk (email or social auth)
   - Create a presentation
   - Export to PPTX and PDF

## Step 6: Custom Domain (Optional)

1. Netlify dashboard → Domain management → Add custom domain
2. Update Clerk Dashboard to include your custom domain in allowed origins
3. Update Supabase auth settings if using Supabase auth providers

## Troubleshooting

### Build Fails: "Module not found"
Ensure all dependencies are installed. Run `pnpm install` locally and commit `pnpm-lock.yaml`.

### 404 on API Routes
The `netlify.toml` redirect rule should handle this. Ensure `@netlify/plugin-nextjs` is installed.

### Database Connection Errors
Check DATABASE_URL is correct and Supabase connection pool is configured.

### Auth redirect loop
Verify `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` are set correctly. Check Clerk Dashboard → Configure → Paths.

---

For detailed comparison with Vercel and additional deployment options, see `DEPLOYMENT_GUIDE.md`.