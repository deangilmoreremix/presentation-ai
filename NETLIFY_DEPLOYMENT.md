# Netlify Deployment Guide

This guide covers deploying Presentation AI to Netlify with Supabase.

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
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-ID].supabase.co:5432/postgres"
NEXTAUTH_SECRET="openssl rand -base64 32"
NEXTAUTH_URL="https://your-site.netlify.app"
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
OPENAI_API_KEY="..." # optional
TOGETHER_AI_API_KEY="..." # optional
SKIP_ENV_VALIDATION=true
```

## Step 5: Post-Deploy

1. **Run database migration:**
   ```bash
   netlify run pnpm db:push
   ```

2. **Update NEXTAUTH_URL** to your actual Netlify URL if different

3. **Test the deployed site:**
   - Visit your Netlify URL
   - Sign in with Google
   - Create a presentation
   - Export to PPTX and PDF

## Step 6: Custom Domain (Optional)

1. Netlify dashboard → Domain management → Add custom domain
2. Update NEXTAUTH_URL to match your custom domain
3. Update Supabase auth redirect URLs

## Troubleshooting

### Build Fails: "Prisma schema not found"
Ensure `postinstall` script runs: `"postinstall": "prisma generate"`. Netlify runs this automatically.

### 404 on API Routes
The `netlify.toml` redirect rule should handle this. Ensure `@netlify/plugin-nextjs` is installed.

### Database Connection Errors
Check DATABASE_URL is correct and Supabase connection pool is configured.

---

For detailed comparison with Vercel and additional deployment options, see `DEPLOYMENT_GUIDE.md`.