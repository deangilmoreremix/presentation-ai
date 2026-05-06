# CI/CD Enhancement & Deployment Validation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:writing-plans for structured changes. Many steps involve editing CI YAML; create exact diffs.

**Goal:** Strengthen the CI/CD pipeline to enforce quality gates (typecheck, lint, test with coverage, build, security scan) and ensure reliable deployments to Vercel & Netlify with zero downtime and easy rollback.

**Architecture:** GitHub Actions workflows with parallel matrix jobs, coverage reporting, automated security scanning, and staged deployment (preview → staging → production). Integrate with existing `ci-cd.yml`.

**Tech Stack:** GitHub Actions, Vercel CLI, Netlify CLI, Playwright, Codecov/codecov-action (optional), Lighthouse CI

---

## Current CI/CD Analysis

Existing `.github/workflows/ci-cd.yml`:

```yaml
jobs:
  test:
    steps: checkout, setup-node, install, env setup, typecheck, lint, build
  deploy:
    needs: test
    if: push to main
    steps: checkout, setup-node, install, build, vercel-action --prod
```

**Gaps:**
- No test execution (`playwright test` never runs!)
- No coverage enforcement
- No security audit (`npm audit`)
- No parallelization
- No preview deployments on PRs
- No smoke tests post-deploy
- No rollback automation beyond Vercel UI

---

## Tasks

### Task 1: Fix CI Test Execution

**File:** `.github/workflows/ci-cd.yml`

- [ ] **Step 1: Add Playwright install & browser dependencies**

The test job needs browsers:

```yaml
- name: Install Playwright browsers
  run: npx playwright install --with-deps

# Or for full install:
- name: Install dependencies
  run: pnpm install --frozen-lockfile
- name: Install Playwright dependencies
  run: npx playwright install-deps
- name: Install Playwright browsers
  run: npx playwright install chromium firefox webkit
```

- [ ] **Step 2: Add actual test step**

```yaml
- name: Run Playwright tests
  run: pnpm test
  env:
    # Required env vars for tests
    OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY || 'sk-mock' }}
    DATABASE_URL: ${{ secrets.DATABASE_URL || 'postgresql://...' }}
    # For CI we can use a test database URL from secrets
```

- [ ] **Step 3: Run tests in matrix for parallelization**

```yaml
strategy:
  matrix:
    os: [ubuntu-latest]
    node: ["18", "20"]
    test-type: ["typecheck", "lint", "unit", "e2e"]
```

But simpler: separate jobs:
- `typecheck` job
- `lint` job
- `unit-test` job (vitest)
- `e2e-test` job (playwright)

Each depends on install.

- [ ] **Step 4: Commit and verify CI runs**

Push; check Actions tab.

---

### Task 2: Add Coverage Reporting

- [ ] **Step 1:** Install codecov (or coveralls) action

```yaml
- name: Upload coverage to Codecov
  uses: codecov/codecov-action@v4
  with:
    token: ${{ secrets.CODECOV_TOKEN }}
    files: ./coverage/coverage-final.json
    fail_ci_if_error: true
```

- [ ] **Step 2:** Add coverage threshold gate locally

`vitest.config.ts` already has thresholds? If not, add:

```typescript
export default defineConfig({
  test: {
    coverage: {
      thresholds: {
        statements: 90,
        branches: 90,
        functions: 90,
        lines: 90,
      },
    },
  },
});
```

Fail CI if thresholds not met.

- [ ] **Step 3:** Add coverage artifact

```yaml
- name: Upload coverage artifact
  uses: actions/upload-artifact@v4
  with:
    name: coverage-report
    path: coverage/
```

- [ ] **Step 4:** View coverage in CI logs

Add step:
```yaml
- name: Display coverage summary
  run: npx vitest report --reporter=text
```

---

### Task 3: Security Scanning

- [ ] **Step 1:** Add `npm audit` with high severity fail

```yaml
- name: Run npm audit
  run: npm audit --audit-level=high
```

- [ ] **Step 2:** Add OWASP dependency check (optional plugin)

`pnpm add -D @docusaurus/remark-plugin-heritage` actually not needed. Better: `snyk` action.

```yaml
- name: Snyk security scan
  uses: snyk/actions/node@master
  env:
    SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
```

If no Snyk token, skip.

- [ ] **Step 3:** Add trivy (for container scan) if Docker builds

---

### Task 4: Preview Deployments on PRs

**File:** `.github/workflows/preview-deploy.yml` (new)

- [ ] **Step 1:** Create new workflow triggered on `pull_request` targeting `main`

```yaml
name: Preview Deploy

on:
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          scope: ${{ secrets.VERCEL_ORG_ID }}
          # Deploy as preview
          github-deployment: true
          github-token: ${{ secrets.GITHUB_TOKEN }}
          comment: true  # Post preview URL as PR comment
```

- [ ] **Step 2:** Verify PRs get preview URLs

Open test PR; confirm Vercel deploys preview.

---

### Task 5: Production Deploy with Health Checks & Rollback

Existing deploy job does auto-deploy on push to main. Improve:

- [ ] **Step 1:** Add `--wait` to Vercel action to block until ready

```yaml
- name: Deploy to Vercel Production
  uses: amondnet/vercel-action@v25
  with:
    vercel-token: ${{ secrets.VERCEL_TOKEN }}
    vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
    vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
    vercel-args: "--prod --wait"
```

- [ ] **Step 2:** Add post-deploy smoke test

After deployment, run Playwright smoke test against production URL:

```yaml
- name: Smoke test production
  if: github.ref == 'refs/heads/main'
  run: |
    pnpm exec playwright test tests/e2e/smoke.spec.ts --base-url=${{ secrets.VERCEL_PROD_URL }}
  env:
    PLAYWRIGHT_TEST_BASE_URL: ${{ secrets.VERCEL_PROD_URL }}
```

- [ ] **Step 3:** Auto-rollback on smoke failure

Vercel action has no rollback; instead, re-deploy previous good commit via:
```yaml
- name: Rollback on failure
  if: failure()
  run: |
    # Use Vercel CLI to promote previous deployment
    npx vercel pull ${{ secrets.VERCEL_TOKEN }} ${{ secrets.VERCEL_ORG_ID }} ${{ secrets.VERCEL_PROJECT_ID }}
    npx vercel promote PREVIOUS_DEPLOYMENT_ID --prod
```

But simpler: manually revert commit. Document rollback procedure in `docs/DEPLOY_ROLLBACK.md`.

---

### Task 6: Database Migration Automation

Current process: manual `pnpm db:push` after deploy.

- [ ] **Step 1:** Add automatic migration step in CI before deploy

```yaml
- name: Apply database migrations
  run: pnpm prisma migrate deploy
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

`migrate deploy` applies pending migrations and fails if conflicts.

- [ ] **Step 2:** Handle migration failures (prevent deploy if migration fails)

Use `needs` ordering: migration job → test job → deploy job.

---

### Task 7: Build Optimization Reporting

- [ ] **Step 1:** Add bundle analysis

```bash
pnpm add -D @next/bundle-analyzer
```

`next.config.js`:
```javascript
const { withBundleAnalyzer } = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});

export default withBundleAnalyzer({ /* existing config */ });
```

CI step:
```yaml
- name: Analyze bundle
  run: ANALYZE=true pnpm build
  # upload .next/analyze/ to artifact
```

- [ ] **Step 2:** Fail build if client-side JS > 500KB (example threshold)

Use `size-limit` package or custom script parsing `.next/static/chunks/` sizes.

---

### Task 8: Environment Secret Management

- [ ] **Step 1:** Document all required secrets in `docs/DEPLOYMENT.md`

List:
- `OPENAI_API_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`
- `API_KEY_ENCRYPTION_MASTER_KEY` (new)
- `SENTRY_DSN` (optional)
- `UPLOADTHING_TOKEN` (if used)
- `UNSPLASH_ACCESS_KEY` (optional)
- `TAVILY_API_KEY` (optional)

- [ ] **Step 2:** Ensure CI uses `secrets.*` and never hardcodes

Verify workflows use `${{ secrets.NAME }}` not `${{ vars.NAME }}` for sensitive.

---

### Task 9: Notifications on Deploy

- [ ] **Step 1:** Notify Slack/Discord on production deploy

```yaml
- name: Notify production deploy
  if: github.ref == 'refs/heads/main'
  run: |
    curl -X POST ${{ secrets.SLACK_WEBHOOK_URL }} \
      -d '{"text":"✅ Production deployed: ${{ github.sha }}"}'
```

---

### Task 10: Post-Deploy Verification Checklist

Create `docs/DEPLOYMENT_CHECKLIST.md`:

- [ ] Health check endpoint returns 200 on prod
- [ ] Auth flow works with OAuth
- [ ] AI generation works (with stubbed key or real)
- [ ] Export buttons functional
- [ ] No JS errors in browser console (automated with Lighthouse CI)

---

## Rollback Procedures

Doc: `docs/ROLLBACK.md`

**Vercel CLI method:**
```bash
npx vercel deployments list --prod
npx vercel promote <previous-deployment-id> --prod
```

**Git revert:**
```bash
git revert <bad-commit>
git push origin main
```

**Database rollback:**
```bash
pnpm prisma migrate resolve --rolled-back <migration-name>
# and manually restore if needed
```

---

## Monitoring Deploy Success

GitHub Actions summary badge in README:
`[![CI](https://github.com/.../actions/workflows/ci-cd.yml/badge.svg)]`

---

## Self-Review

- [ ] All CI stages run (typecheck, lint, test, build)
- [ ] Coverage threshold enforced (fails if <90%)
- [ ] Security audit runs and passes (no high vulnerabilities)
- [ ] Preview deploys on PRs
- [ ] Production deploy is atomic (no broken state)
- [ ] Smoke tests pass post-deploy
- [ ] Rollback documented and tested (dry-run)

---

**Plan Duration:** 3–4 hours  
**Blocks:** None (infrastructure only)  
**Priority:** HIGH — needed before final production launch
