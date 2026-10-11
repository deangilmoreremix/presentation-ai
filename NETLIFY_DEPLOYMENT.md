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

## Clerk `Missing publishableKey` troubleshooting

The application initializes Clerk in `src/app/layout.tsx` and uses Clerk middleware in `src/proxy.ts`. A successful Netlify deploy does not prove that the Clerk publishable key was present when Next.js compiled the app.

1. Identify the actual Netlify site and deploy context. This repository has previously been deployed to more than one Netlify site; settings on one do not automatically apply to the other.
2. In that site's environment-variable settings, configure `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` with the publishable key, available to **Builds** (for the matching production/preview/branch context). Configure `CLERK_SECRET_KEY` server-side for **Functions** as well, and for **Builds** if required by the build. Do not store secrets in `netlify.toml`, Git history, or client code.
3. Ensure both keys are from the **same Clerk instance**. Use production keys and an authorized production domain when publishing publicly, rather than development-instance keys.
4. Trigger a **new build and deploy** after changing these variables; a deploy that simply republishes existing build artifacts will still contain the previous `NEXT_PUBLIC_*` values.
5. For local development, save the keys in the repository-root `.env.local`, without quote or line-break artifacts; restart `pnpm dev`. Do not commit `.env.local`.
6. If the problem persists, verify key presence **without logging values**: `node -e 'console.log({ publishableKeyPresent: !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim(), secretKeyPresent: !!process.env.CLERK_SECRET_KEY?.trim() })'`. Execute in the same environment/context as the failing process; this check does not establish validity of the keys.

If a secret key was shared in chat, logs, issues, or other non-secret locations, rotate it in Clerk and replace it in all relevant deployment environments.
