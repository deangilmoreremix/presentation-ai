# Supabase Connectivity & Database Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish reliable database connectivity, verify schema, and ensure the application can persist and retrieve data.

**Architecture:** Diagnose network connectivity issues (SSL, IP allowlist, egress), apply fixes, validate with Prisma migrations and health checks. This creates the foundation for all server-side features including encrypted API key storage.

**Tech Stack:** Supabase (PostgreSQL), Prisma ORM, Next.js middleware, SSL/TLS networking

---

## File Structure & Context

**Files to modify:**
- `.env` — DATABASE_URL with SSL parameters
- `prisma/schema.prisma` — database schema definition
- `src/env.js` — environment validation
- `src/lib/supabase/server.ts` — Supabase client helper
- `src/app/api/health/route.ts` — health check endpoint enhancement

**Key configurations:**
- Database: `postgresql://...supabase.co:5432/postgres?sslmode=require`
- Prisma: uses connection pooling, SSL mode required
- Network: Outbound port 5432 must be open

---

## Tasks

### Task 1: Diagnose & Document Current Connectivity State

**Files:**
- Diagnostic only (no file changes)

- [ ] **Step 1: Document exact network parameters**

Create a diagnostic report by running:
```bash
# Check DNS resolution
nslookup db.bzxohkrxcwodllketcpz.supabase.co

# Check TCP connectivity (if nc/telnet available)
# nc -zv db.bzxohkrxcwodllketcpz.supabase.co 5432

# Check local IP (what Supabase would see)
curl -s https://api.ipify.org
echo "Workspace IP: $(hostname -I | awk '{print $1}')"

# Test PostgreSQL SSL handshake using openssl s_client
echo | openssl s_client -connect db.bzxohkrxcwodllketcpz.supabase.co:5432 -brief 2>&1 | head -10

# Verify Prisma can parse connection string
npx prisma validate --schema=prisma/schema.prisma
```

Record output in a file `docs/diagnostics/network-connectivity-$(date +%Y-%m-%d).md`.

**Expected:** Know whether DNS resolves, TCP connects, TLS handshake succeeds, Prisma schema valid.

- [ ] **Step 2: Check Supabase project status**

Visit https://supabase.com/dashboard/project/bzxohkrxcwodllketcpz
Verify:
- Database status: **Resumed** (not paused)
- Connection pool settings
- IP allowlist: does it include the workspace IP from Step 1?
- SSL enforcement: is `require` enforced?

Capture screenshots or record values in the diagnostic report.

**If IP allowlist is enabled and does not include this IP**, skip to Task 2.2 to request allowlist addition.

**Expected:** Clear understanding of Supabase network configuration.

---

### Task 2: Fix DATABASE_URL SSL Configuration

**Files:**
- Modify: `.env` (DATABASE_URL line)

- [ ] **Step 1: Ensure SSL mode is set to `require`**

Current `.env` has:
```env
DATABASE_URL="postgresql://postgres:VideoRemix2026@db.bzxohkrxcwodllketcpz.supabase.co:5432/postgres?sslmode=require"
```

Verify it includes `?sslmode=require` at the end. If missing, add it.

Also consider adding connection pooling params recommended by Supabase:
```env
DATABASE_URL="postgresql://postgres:VideoRemix2026@db.bzxohkrxcwodllketcpz.supabase.co:5432/postgres?sslmode=require&pgbouncer=true&connect_timeout=30"
```

Run: `grep DATABASE_URL .env` to confirm.

**Expected:** SSL required in connection string.

- [ ] **Step 2: Test Prisma connection with SSL**

```bash
# Generate Prisma client fresh
pnpm prisma generate

# Attempt to push schema (dry-run first to check connectivity)
pnpm prisma db push --skip-generate --preview-feature 2>&1 | tee /tmp/prisma-db-push.log

# If that fails, try with accept-data-loss to force sync
pnpm prisma db push --accept-data-loss 2>&1 | tee /tmp/prisma-db-push-forced.log
```

**Observe:**
- Success → schema syncs, no errors
- Failure → capture exact error code (P1001, P1003, etc.) and message

If still failing with **P1001 (can't reach database)**, proceed to Task 3 (IP allowlist).

If failing with **SSL errors** (`SSL SYSCALL error: Broken pipe`, `certificate verify failed`), add `?sslmode=require` or try `?sslmode=require&sslsecure=true`.

**Expected:** `db push` completes successfully (even with data-loss warning is OK for dev).

- [ ] **Step 3: Update Prisma schema connection settings (if needed)**

If connection pooling issues persist, add to `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  // Optional: add directUrl for migrations if using connection pooler
  // directUrl = env("DIRECT_DATABASE_URL")
}
```

**Expected:** Prisma configured for Supabase.

---

### Task 3: Configure Supabase IP Allowlist (If Required)

**Files:** None (external dashboard)

- [ ] **Step 1: Identify current public IP**

From Task 1 we have the public IP. Confirm:
```bash
curl -s https://api.ipify.org
```

Write this IP to `docs/diagnostics/required-ip-allowlist-entry.txt`.

- [ ] **Step 2: Add IP to Supabase allowlist (manual step — user action required)**

Instruct user (or perform if credentials available):

1. Go to Supabase Dashboard → **Authentication** → **Settings** → **Network**
2. Under **IP allowlist**, click **Add IP**
3. Enter the IP from Step 1 (or `0.0.0.0/0` to allow all temporarily)
4. Save

**If user cannot modify allowlist**, note:
- This is a **blocking** issue
- Workaround: Use local Supabase instance or allow-list this IP
- Cannot proceed with DB features without network access

**Expected:** IP allowlist updated to include workspace IP.

- [ ] **Step 3: Retry connectivity**

Re-run from Task 2.2:
```bash
pnpm prisma db push --accept-data-loss
```

**Expected:** Success.

---

### Task 4: Verify Database Schema & Apply Migrations

**Files:**
- `prisma/schema.prisma` — ensure user table has API key columns (for later)

- [ ] **Step 1: Review current schema**

Read `prisma/schema.prisma` fully. Verify it matches expectations:
- Models: User, BaseDocument, Presentation, PresentationTheme, etc.
- Indexes present on foreign keys
- Proper `@relation` attributes

If missing the API key columns (we'll add them later), note they'll be added in a future migration.

**Expected:** Schema file complete and valid.

- [ ] **Step 2: Generate and apply migration**

```bash
# Create migration (even if no changes yet — establishes baseline)
pnpm prisma migrate dev --name initial_schema --create-only

# Push schema to database
pnpm prisma db push --accept-data-loss

# If push fails with schema mismatch errors, inspect and resolve
# Common: enum type discrepancies, missing indexes
```

**Expected:** Database schema matches Prisma schema with no errors.

- [ ] **Step 3: Verify Prisma Client can query the database**

Write a quick integration test script `scripts/verify-db-connection.ts`:

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Test read (user count)
  const userCount = await prisma.user.count();
  console.log(`Users in DB: ${userCount}`);

  // Test write (if empty, create dummy)
  if (userCount === 0) {
    await prisma.user.create({
      data: { id: 'test-user', email: 'test@example.com' }
    });
    console.log('Created test user');
  }

  console.log('✅ Database connection successful');
}

main()
  .catch(e => {
    console.error('❌ DB connection failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
```

Run it:
```bash
npx tsx scripts/verify-db-connection.ts
```

**Expected:** Script prints "Users in DB: X" without errors.

- [ ] **Step 4: Seed test data (optional but recommended)**

If `users` table empty, create a test user record for later API testing:
```sql
INSERT INTO users (id, email, name, role, "hasAccess", created_at, updated_at)
VALUES ('test-user-1', 'test@example.com', 'Test User', 'USER', false, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
```

Use Supabase SQL editor or `psql` if available.

**Expected:** Test data available for integration tests.

---

### Task 5: Enhance Health Check to Report DB Status

**Files:**
- Modify: `src/app/api/health/route.ts`

- [ ] **Step 1: Add database connectivity check to health endpoint**

Update `src/app/api/health/route.ts` to include DB health:

```typescript
import { db } from "@/server/db"; // we'll create this wrapper

export async function GET() {
  const health = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || "1.0.0",
    environment: process.env.NODE_ENV,
    database: "unknown",
  };

  try {
    // Quick connection test
    await db.$queryRaw`SELECT 1`;
    health.database = "connected";
  } catch (dbError) {
    health.status = "unhealthy";
    health.database = "disconnected";
    health.databaseError = dbError instanceof Error ? dbError.message : "Unknown error";
  }

  return NextResponse.json(health, { status: health.status === "healthy" ? 200 : 503 });
}
```

**Expected:** `/api/health` now returns `{ database: "connected" }` when DB reachable.

- [ ] **Step 2: Test health endpoint**

```bash
curl http://localhost:3000/api/health | jq .
```

**Expected:** JSON with `"database": "connected"`.

---

### Task 6: Verify Dev Server Works Without DB Errors

**Files:**
- None (runtime verification)

- [ ] **Step 1: Start dev server with fresh env**

```bash
# Ensure .env is loaded
export $(grep -v '^#' .env | xargs)

# Kill any existing dev server
pkill -f "next dev" || true

# Start fresh
pnpm dev > /tmp/dev-server.log 2>&1 &
sleep 10

# Test routes
curl -I http://localhost:3000
curl -I http://localhost:3000/presentation
curl -I http://localhost:3000/auth/signin
```

**Expected:** No database-related errors in logs. Routes respond with redirects (307).

- [ ] **Step 2: Check for silent DB errors**

Grep logs for Prisma/DB errors:
```bash
grep -i "prisma\|database\|p1001\|p1000" /tmp/dev-server.log || echo "No DB errors in startup logs ✅"
```

**Expected:** Clean startup or only "Waiting for database connection" retries (not fatal).

- [ ] **Step 3: Document final configuration**

Create `docs/SUPABASE_SETUP.md` summarizing:
- DATABASE_URL format with SSL
- IP allowlist requirements
- Prisma generation and migration commands
- Health check endpoint usage
- Troubleshooting common errors (P1001, P1003)

**Expected:** Documentation complete.

---

## Testing Strategy (TDD Per Step)

Every code change follows RED-GREEN-REFACTOR:

- Database connection script (`scripts/verify-db-connection.ts`) → write test, fail, implement, pass
- Health check DB logic → unit test with mocked Prisma client
- Integration: `curl /api/health` returns 200 when DB up, 503 when down

**No placeholders:** Each task includes exact commands and expected output.

---

## Self-Review Checklist

Before marking this plan complete:

- [ ] All database connectivity tests pass consistently (retry 3×)
- [ ] Prisma client generated without warnings
- [ ] Health check reports DB status accurately
- [ ] Dev server starts without fatal DB errors
- [ ] Schema validated against actual database
- [ ] IP allowlist documented (if applicable)
- [ ] No credentials committed to git (.env in .gitignore)
- [ ] Diagnostic data saved for troubleshooting if issues recur

---

## 📁 Deliverables Summary

| File | Purpose |
|------|---------|
| `docs/diagnostics/network-connectivity-YYYY-MM-DD.md` | Diagnostic log of network state |
| `docs/diagnostics/required-ip-allowlist-entry.txt` | IP that needs allowlisting |
| `scripts/verify-db-connection.ts` | DB connectivity test script |
| `docs/SUPABASE_SETUP.md` | Setup guide for future developers |
| `.env` | Updated DATABASE_URL with SSL |

**No new runtime dependencies added.**

---

## ⚠️ Known Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| IP allowlist cannot be modified (hosted environment restriction) | Request user to add IP or use a local Supabase instance for development |
| SSL handshake failures | Test alternative SSL params (`?sslmode=require&sslsecure=true`) |
| Prisma version incompatible with Supabase | Pin Prisma to v6.x known compatible; test with `prisma --version` |
| Database paused (free tier) | User must manually resume via dashboard; cannot automate |

---

**Plan Status:** Not started — ready to execute.

**Estimated Duration:** 1–3 hours depending on network accessibility resolution.
