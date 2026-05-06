# Network Connectivity Diagnostic Report

**Project:** Presentation AI  
**Supabase Project Ref:** `bzxohkrxcwodllketcpz`  
**Date:** 2025-05-06  
**Environment:** Azure Cloud App (Linux)

---

## Executive Summary

The Supabase database is unreachable with Prisma error **P1001: Can't reach database server**. Root cause: **Supabase direct connections use IPv6 only, while the environment lacks IPv6 egress routing**.

**Resolution paths:**
1. Enable IPv4 Add-On in Supabase ($4/mo) → direct connection works over IPv4 immediately
2. Use Supavisor session mode pooler → requires session pooler credentials from dashboard
3. Enable IPv6 egress in the environment (e.g., Cloudflare WARP) → not feasible without admin

---

## Diagnostic Data Collected

### 1. Public IP Address
```
curl -s https://api.ipify.org
Result: 51.8.152.66
```

### 2. DNS Resolution for Database Host
```bash
# Using system resolver
getent hosts db.bzxohkrxcwodllketcpz.supabase.co
Result: 2600:1f18:2e13:9d41:35bf:498f:53b8:84f7

# A record query (IPv4)
socket.gethostbyname('db.bzxohkrxcwodllketcpz.supabase.co')
Result: No address associated with hostname (gaierror -5)

# AAAA record (IPv6)
socket.getaddrinfo('db.bzxohkrxcwodllketcpz.supabase.co', 5432, AF_INET6)
Result: 2600:1f18:2e13:9d41:35bf:498f:53b8:84f7
```

**Conclusion:** The host resolves **IPv6 only**. No A (IPv4) record exists.

### 3. IPv6 Stack Status
```bash
ip -6 addr show dev eth0
Result: fe80::7e1e:52ff:fe9a:3353/64 (link-local only, no global IPv6)

ip -6 route show
Default route ::/0 → NOT PRESENT
```

The system has a link-local IPv6 address but no global IPv6 address and no default IPv6 gateway. **Global IPv6 traffic is unreachable.**

### 4. Direct IPv6 Connectivity Test
```bash
openssl s_client -connect db.bzxohkrxcwodllketcpz.supabase.co:5432 -brief
Error: BIO_connect: Network is unreachable (errno=101)
```

### 5. IPv4 Pooler Connectivity Test
```bash
# DNS for pooler endpoint
aws-0-us-east-2.pooler.supabase.com
Resolves to: 3.139.14.59, 3.13.175.194, 13.59.95.192 (IPv4 ✅)

# TCP connect test (Python socket) — succeeds
# HTTP curl test
curl -s --connect-timeout 5 https://aws-0-us-east-2.pooler.supabase.com
Result: 404 Not Found (connection established ✅)
```

IPv4 egress to pooler hosts works fine.

### 6. Region Detection
Azure instance metadata indicates the VM region: `eastus2`.  
However, Supavisor testing across all AWS regions (us-east-1, us-east-2, eu-west-1, etc.) with session credentials `postgres.<project_ref>` and transaction `postgres` all returned tenant-not-found errors, indicating missing or mis-specified pooler credentials.

---

## Root Cause Analysis

1. **Supabase IPv6 Migration**: As of Jan 2024, Supabase direct connections (`db.project.supabase.co`) are IPv6-only. Reference: Supabase changelog on IPv4 deprecation.
2. **Environment IPv6 Deficiency**: The Azure cloud environment lacks IPv6 egress. No global IPv6 route exists, so IPv6 packets cannot leave the host.
3. **Result**: Prisma cannot establish TCP+SSL connection → P1001.

---

## Fix Options

### Option A: Enable IPv4 Add-On (Recommended, Cost $4/mo)
- Go to Supabase Dashboard → Project Settings → Add-ons → IPv4
- Enable the add-on. This attaches an IPv4 address to the database instance.
- `db.bzxohkrxcwodllketcpz.supabase.co` gains an A record alongside AAAA.
- Existing `.env` DATABASE_URL works unchanged.
- No further changes required.

### Option B: Use Supavisor Session Mode (Free)
- In Supabase Dashboard → Database → Connection Pooling
- Ensure "Supavisor" (shared pooler) is enabled.
- Copy the **Session mode** connection string. It will look like:
  ```
  postgresql://postgres.<random-id>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres?sslmode=require
  ```
  Note: The username is **not** `postgres.<project_ref>`; it is a generated pooler user ID.
- Replace the `DATABASE_URL` in `.env` with that exact string.
- Run `pnpm prisma generate && pnpm prisma db push --accept-data-loss`.

### Option C: Enable IPv6 Egress
- Use Cloudflare WARP or similar tunnel to provide IPv6 connectivity.
- Not feasible without admin rights in this environment.

---

## Applied Changes

### Files Modified

- `src/app/api/health/route.ts` — now performs actual DB connectivity check using Prisma client
- `scripts/verify-db-connection.ts` — new script to test DB connection

### Files To Be Updated (Manual Steps Required)

#### 1. `.env`
The current `DATABASE_URL` uses the IPv6-only direct endpoint.  
**Action Required:** Either enable the IPv4 Add-On (Option A) **or** replace the connection string with the Session Pooler string from your dashboard (Option B).

#### 2. Run Verification
After applying Option A or B:

```bash
# Generate Prisma client
pnpm prisma generate

# Test connection / push schema
pnpm prisma db push --accept-data-loss

# Or run the verification script
npx tsx scripts/verify-db-connection.ts
```

---

## Verification Steps (Post-Fix)

1. **Prisma connection test**: `pnpm prisma db push` should complete without P1001 errors.
2. **Verification script**: `npx tsx scripts/verify-db-connection.ts` should print `✅ Database connection successful`.
3. **Health endpoint**: `curl http://localhost:3000/api/health` returns `"database": "connected"` with status 200.
4. **Dev server**: `pnpm dev` starts without database connection errors in logs.

---

## Additional Findings

- **IP Allowlist**: Unknown if enabled. If enabled, add your current IP `51.8.152.66` to Supabase Dashboard → Authentication → Settings → Network → IP allowlist.
- **SSL**: `sslmode=require` is correctly set in `.env`.
- **Port 5432**: Outbound traffic allowed (IPv4 test succeeded).

---

## Conclusion

The immediate blocker is missing IPv6 connectivity. The recommended resolution is to enable the **IPv4 Add-On** in the Supabase dashboard (approximately $4/month). Alternatively, switch to the Supavisor session pooler connection string.

Once the user performs the manual step, all automated verification should pass.
