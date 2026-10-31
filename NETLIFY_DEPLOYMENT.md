# Netlify Deployment Guide

Smart Presentations deploys to Netlify with `@netlify/plugin-nextjs` (Next.js 16).
All build settings live in `netlify.toml`; you only need to set environment variables.

## 1. Build settings

`netlify.toml` (already committed):

```toml
[build]
  command = "pnpm build"
  publish = ".next"

[build.environment]
  NODE_VERSION = "22"
  NODE_OPTIONS = "--max-old-space-size=4096"
  SKIP_ENV_VALIDATION = "true"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

In the Netlify UI leave **Publish directory** as `.next` and **Functions directory** empty.

> ⚠️ Do **not** set the publish directory to `.next/standalone` and do not add
> `/api/*` redirects to `/.netlify/functions`. Both bypass the Next.js runtime
> plugin and produce a blank site / 404s. `output: "standalone"` is only used
> for the Docker image and is disabled automatically on Netlify.

## 2. Environment variables

Site configuration → Environment variables. `NEXT_PUBLIC_*` values are inlined
at build time, so **redeploy after changing them**.

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | ✅ | Clerk → API Keys. Without it the site shows a setup page. |
| `CLERK_SECRET_KEY` | ✅ | Clerk → API Keys |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase → Project Settings → API |
| `OPENAI_API_KEY` | ✅ | Text + image generation (users can also add their own key in Settings) |
| `API_KEY_ENCRYPTION_MASTER_KEY` | ✅ if users save API keys | `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `DATABASE_URL` | optional | Supabase Postgres URL; persists AI agent conversations (in-memory otherwise) |
| `CLERK_WEBHOOK_SECRET` | optional | For `/api/webhooks/clerk` |
| `UNSPLASH_ACCESS_KEY`, `PIXABAY_API_KEY`, `PEXELS_API_KEY`, `GIPHY_API_KEY` | optional | Stock image / GIF search |
| `TAVILY_API_KEY` | optional | Web research |
| `TOGETHER_AI_API_KEY`, `PINECONE_API_KEY` | optional | Alternate models / vector search |
| `UPLOADTHING_TOKEN` | optional | Image uploads |
| `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_DSN` | optional | Error tracking |

## 3. Clerk

- Add your Netlify domain (and custom domain) in Clerk → Domains.
- Production Clerk instances load their script from `clerk.<your-domain>`; the
  app's Content-Security-Policy derives that host from the publishable key
  automatically.

## 4. Database

Apply the Supabase migrations in `supabase/migrations` (`pnpm db:push`) before first use.

## 5. Verify

```bash
curl https://<site>.netlify.app/api/health
```

Then open `/` (landing page), `/templates` (Free PPT Templates + Smart Layouts)
and sign in.

## Troubleshooting

- **Blank page:** wrong publish dir (must be `.next`), or the latest build failed
  and Netlify is still serving an older deploy. Check the deploy log.
- **"Configuration missing" page:** Clerk keys not set at build time — set them and redeploy.
- **Sign-in widget never appears:** check the browser console for CSP violations
  and that the domain is configured in Clerk.
- **`ERR_PNPM_LOCKFILE_CONFIG_MISMATCH`:** run `pnpm install` locally and commit `pnpm-lock.yaml`.
