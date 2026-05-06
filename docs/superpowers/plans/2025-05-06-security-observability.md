# Security Hardening & Observability

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:systematic-debugging for security issues; superpowers:writing-plans for structured implementation. Non-code tasks (config review) included.

**Goal:** Harden the application against common web vulnerabilities (XSS, CSRF, injection), add production-grade observability (structured logging, error monitoring, health checks), and ensure compliance with security best practices.

**Architecture:** Defense-in-depth: secure headers via Next.js config, input validation on all server inputs, encrypted storage for API keys, rate limiting, audit-ready logging. Observability via Sentry (errors), structured JSON logs (pino/winston), and enriched health checks.

**Tech Stack:** Next.js security features, Helmet-style headers, Sentry, pino/winston, OpenTelemetry (optional), Vercel Runtime

---

## Tasks

### Phase 1: Security Headers & HTTPS Enforcement

**Files:**
- `next.config.js`
- `middleware.ts` (new if needed, or use existing layout headers)

- [ ] **Step 1: Add Content Security Policy**

Create `next.config.js` headers:

```javascript
const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Next.js needs inline for dev
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https://lh3.googleusercontent.com https://*.ufs.sh https://images.unsplash.com",
      "font-src 'self' data:",
      "connect-src 'self' https://api.openai.com https://*.supabase.co",
      "frame-ancestors 'none'",
    ].join("; "),
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "geolocation=(), microphone=(), camera=()",
  },
];

export default {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
  images: { /* existing remotePatterns */ },
};
```

- [ ] **Step 2: HSTS header (HTTPS-only)**

Add to same headers:
```javascript
{
  key: "Strict-Transport-Security",
  value: "max-age=63072000; includeSubDomains; preload",
}
```

- [ ] **Step 3: Test headers**

```bash
curl -I http://localhost:3000 | grep -i "content-security-policy\|x-frame-options\|strict-transport-security"
```

All present? ✅

- [ ] **Step 4: Enforce HTTPS in production (Vercel)**

In `vercel.json` (if exists) or project settings, set **Redirect to HTTPS**.

---

### Phase 2: Input Validation & Sanitization

**Critical paths:**
- API key input (`ApiKeyModal`)
- Presentation prompt input (text generation)
- Theme customization inputs

- [ ] **Step 1: Sanitize user prompts before sending to OpenAI**

Add `src/lib/sanitize.ts`:

```typescript
export function sanitizePrompt(text: string): string {
  // Strip dangerous patterns (prompt injection, embedded instructions)
  // But preserve content — don't over-sanitize
  return text.trim().replace(/\0/g, ""); // basic null-byte strip
}
```

Use in generation actions before embedding into system prompts.

- [ ] **Step 2: Validate API key format rigorously**

In `src/lib/crypto/key-encryption.ts`:
```typescript
export function validateOpenAIKeyFormat(key: string): boolean {
  return /^sk-[A-Za-z0-9]{32,}$/.test(key);
}
```

Reject keys that don't match before attempting API call.

- [ ] **Step 3: Length limits on all inputs in UI**

Add `maxLength` attributes to textareas and inputs to prevent DoS via huge payloads.

---

### Phase 3: Error Monitoring (Sentry)

**Files:**
- `.env.example`
- `src/lib/observability/error-boundary.tsx` (new)
- `src/app/layout.tsx` (wrap with Sentry)

- [ ] **Step 1: Install Sentry**

```bash
pnpm add @sentry/nextjs @sentry/react
```

- [ ] **Step 2: Configure Sentry in `sentry.client.config.ts` and `sentry.server.config.ts`**

```typescript
// sentry.client.config.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
});
```

- [ ] **Step 3: Add environment variable to `.env`**

`SENTRY_DSN="https://...@sentry.io/..."`

- [ ] **Step 4: Wrap `RootLayout` with `Sentry.ErrorBoundary` and `Sentry.Profiler`**

```tsx
import { ErrorBoundary } from "@sentry/nextjs";

export default function RootLayout({ children }) {
  return (
    <html>...
      <body>
        <ErrorBoundary fallback={<p>Something went wrong</p>}>
          {children}
        </ErrorBoundary>
      </body>
    </html>
  );
}
```

- [ ] **Step 5: Capture unhandled rejections**

```typescript
import * as Sentry from "@sentry/nextjs";

process.on("unhandledRejection", (err) => {
  Sentry.captureException(err);
});

// Already handled by Sentry Next.js SDK
```

- [ ] **Step 6: Verify Sentry receives test error**

```typescript
// temporary dev-only route: /api/test-sentry
throw new Error("Test Sentry connection");
```

Visit → check Sentry dashboard.

- [ ] **Step 7: Add breadcrumbs for key actions**

```typescript
Sentry.addBreadcrumb({
  category: "action",
  message: "User generated presentation",
  level: "info",
  data: { userId, outlineLength },
});
```

---

### Phase 4: Structured Logging

**Replace `console.log` with JSON logger.**

- [ ] **Step 1: Choose logger (pino or winston)**

Recommended: `pino` (fast, JSON). Or `winston` for flexibility.

```bash
pnpm add pino pino-pretty
```

- [ ] **Step 2: Create `src/lib/observability/logger.ts`**

```typescript
import pino from "pino";

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport:
    process.env.NODE_ENV === "development"
      ? { target: "pino-pretty", options: { colorize: true } }
      : undefined,
});

export { logger };
```

Usage: `import { logger } from "@/lib/observability/logger"; logger.info({ userId }, "generated image");`

- [ ] **Step 3: Replace `console.log` in server code**

- [ ] **Step 4: Add request-scoped logging** (optional advanced)

Use `AsyncLocalStorage` to store request ID.

---

### Phase 5: Enhanced Health Check

Already partly done in Phase 1; extend:

**File:** `src/app/api/health/route.ts`

Add checks:
- OpenAI API reachability (simple models.list call with timeout)
- Redis (if later added)
- Uptime in seconds

- [ ] **Step 1:** Implement external API ping (with 2s timeout, non-blocking)
- [ ] **Step 2:** Return `{ status: "healthy" | "degraded", checks: { db, openai, redis } }`
- [ ] **Step 3:** Test via `curl`

---

### Phase 6: Security Audit Checklist

- [ ] **Cross-Site Scripting (XSS)**
  - All user inputs rendered as text (React auto-escapes) — ✅
  - No `dangerouslySetInnerHTML` without DOMPurify — AUDIT
  - CSP mitigates inline script injection

- [ ] **Cross-Site Request Forgery (CSRF)**
  - Server Actions have built-in CSRF protection — ✅
  - API routes use session cookies with `SameSite=Lax` — ✅

- [ ] **SQL Injection**
  - Prisma parameterized queries — ✅
  - No raw SQL without parameterization — AUDIT

- [ ] **Authentication & Session**
  - `NEXTAUTH_SECRET` replaced by Supabase session — ✅
  - Refresh token rotation enabled in Supabase? Verify
  - Session expiry reasonable (7 days from earlier auth.ts) — review

- [ ] **Sensitive Data Exposure**
  - API keys never logged — add checks via `logger` to redact
  - `.env` not committed — already in `.gitignore` — ✅
  - HTTPS enforced in production — ✅ (Vercel)

- [ ] **Rate Limiting**
  - Already present on `/api/` routes — verify on AI generation endpoints
  - Add per-user rate limit for API key creation (5/min) to prevent abuse

---

### Phase 7: Dependencies Security Audit

- [ ] **Step 1:** `pnpm audit` — fix high/critical vulnerabilities
- [ ] **Step 2:** `pnpm outdated` — update stale dependencies
- [ ] **Step 3:** `pnpm license-check` — ensure no GPL contamination

---

## Observability Dashboard (Optional)

Create `src/app/admin/monitoring/page.tsx` (admin-only):

- Active user count (last 15 min)
- Request rate (per-minute)
- Error rate (from Sentry or logs)
- OpenAI API latency (p95)
- Database connection health

Read-only, protected by role check (`user.role === "ADMIN"`).

---

## Test Coverage

- **Unit tests** for Sanitize, RateLimit, Crypto — added in Plan D
- **E2E**: Verify CSP headers present via Playwright `page.response().headers()`

---

## Documentation

Create `docs/SECURITY.md`:
- Security policy
- How to report vulnerabilities
- Headers explanation
- Key rotation process

Update `docs/OBSERVABILITY.md`:
- Logging format (JSON schema)
- Metrics exposed
- Sentry project link

---

## Self-Review

- [ ] All CSP directives correct, no unsafe-inline in production (next/script can handle with nonce)
- [ ] HSTS header present with long max-age
- [ ] No `console.log` in production builds (replace with logger)
- [ ] Sentry captures test exception in staging
- [ ] Health check returns accurate status
- [ ] Audit logs (if any) not writing PII

---

**Plan Duration:** 4–6 hours  
**Blocks:** None (independent of API key modal)  
**Priority:** HIGH (security must be in place before production)
