# Comprehensive Test Suite Expansion — Target 90% Coverage

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:test-driven-development to write tests following RED-GREEN-REFACTOR cycle. Every step includes exact test code and implementation.

**Goal:** Increase test coverage from current ~20% to ≥90% across statements, branches, and functions. Add missing unit, integration, and E2E tests for core functionality including API key management, AI generation, export, auth flows, and critical utilities.

**Architecture:** Tests mirror the existing structure (`tests/unit/`, `tests/integration/`, `tests/e2e/`). Use Vitest for unit/integration, Playwright for E2E. Mock external APIs (OpenAI, Supabase) with `vi`/`nock`. Use `@playwright/test` fixtures for authenticated state.

**Tech Stack:** Vitest, Playwright, @testing-library/react, Supertest, nock/msw, coverage collection (v8)

---

## Current Coverage Baseline

Run existing suite to establish baseline:

```bash
pnpm test --coverage --reporter=html
```

Expected gaps:
- `src/lib/` utilities: low coverage
- `src/app/_actions/` server actions: mostly untested
- `src/components/` UI components: spotty coverage
- `src/server/` auth & db helpers: minimal coverage

---

## Coverage Targets by Area

| Area | Current | Target | Critical Tests |
|------|---------|--------|----------------|
| Utilities (`src/lib/`) | ~0% | ≥90% | rate-limit, modelPicker, key-encryption, key-storage |
| Server Actions (`src/app/_actions/`) | ~10% | ≥85% | image generate, presentation generate, outline |
| API Routes (`src/app/api/`) | ~20% | ≥90% | all auth-required endpoints |
| Components (`src/components/`) | ~30% | ≥80% | modal, settings, generate controls |
| Hooks (`src/hooks/`) | ~0% | ≥90% | useAuth, useApiKey |
| Integration (DB) | ~0% | ≥80% | User CRUD, presentation CRUD |

---

## File Structure & New Tests

```
tests/
├── unit/
│   ├── lib/
│   │   ├── rate-limit.test.ts
│   │   ├── model-picker.test.ts
│   │   ├── env/
│   │   └── crypto/
│   │       ├── key-encryption.test.ts
│   │       └── key-storage.test.ts
│   ├── server/
│   │   ├── auth.test.ts
│   │   └── db.test.ts
│   ├── hooks/
│   │   ├── use-auth.test.ts
│   │   └── use-api-key.test.ts
│   └── components/
│       ├── settings/ApiKeyModal.test.tsx
│       ├── settings/SettingsPage.test.tsx
│       └── presentation/SharedGenerateControls.test.tsx
├── integration/
│   ├── api/
│   │   ├── user/api-key.test.ts
│   │   ├── presentation/generate.test.ts
│   │   ├── presentation/outline.test.ts
│   │   └── image/generate.test.ts
│   └── db/
│       └── presentation-crud.test.ts
└── e2e/
    ├── auth-flow.spec.ts
    ├── presentation-creation.spec.ts
    ├── api-key-modal.spec.ts
    ├── export-pptx.spec.ts
    ├── export-pdf.spec.ts
    └── critical-path.spec.ts   # full user journey
```

---

## Implementation Tasks

### Task Group 1: Unit Tests

**Task 1A: `src/lib/rate-limit` tests**

- [ ] **Step 1:** Write `tests/unit/lib/rate-limit.test.ts`

Test cases:
- Initial request succeeds, remaining count correct
- Subsequent requests decrement remaining
- Request beyond max returns `{ success: false, resetIn: number }`
- Different IPs tracked separately
- Auto-cleanup interval purges old entries

Mock `Date.now()` for deterministic window tests.

- [ ] **Step 2:** [RED] Run test → FAIL (module not imported correctly)
- [ ] **Step 3:** [GREEN] Implementation already exists; just fix import path if needed
- [ ] **Step 4:** [REFACTOR] Ensure code is testable (maybe extract core logic from `rateLimit` function)
- [ ] **Step 5:** Commit

- [ ] **Step 6:** Repeat for `authenticatedRateLimit`

**Task 1B: `src/lib/modelPicker` tests**

- [ ] **Step 1:** `tests/unit/lib/model-picker.test.ts`
  - Test `modelPicker()` returns correct provider/model based on env
  - Test `ensureModelIsReady()` handles loading states
  - Test `assertModelIsConfigured()` throws if no API key

**Task 1C: `key-encryption` tests** (depends on Plan B)

- [ ] **Step 1:** `tests/unit/lib/crypto/key-encryption.test.ts`
  - Encrypt then decrypt returns original key
  - Different IVs produce different ciphertexts
  - Wrong KEK fails decryption
  - Tampered ciphertext throws

- [ ] **Step 2:** `tests/unit/lib/crypto/key-storage.test.ts`
  - `saveApiKey` persists to localStorage
  - `getApiKey` retrieves
  - `removeApiKey` deletes
  - `getKeyStoragePreference` defaults to "client"

**Task 1D: Component unit tests** (React Testing Library)

- [ ] **ApiKeyModal.test.tsx** (Plan B component)
- [ ] **SettingsPage.test.tsx**
- [ ] **SharedGenerateControls.test.tsx** — disable button when no key, enable when key present

---

### Task Group 2: Integration Tests (API Routes)

**Task 2A: `/api/user/api-key` routes**

- [ ] **Step 1:** `tests/integration/api/user/api-key.test.ts`

Use Supertest with Jest:

```typescript
import request from "supertest";
import { createServerClient } from "@supabase/supabase-js";
import { db } from "@/server/db";

// Mock auth middleware to simulate logged-in user
describe("GET /api/user/api-key", () => {
  it("returns masked key for authenticated user", async () => {
    const response = await request(app).get("/api/user/api-key").set("Cookie", "session=...");
    expect(response.body.maskedKey).toMatch(/^sk-\.\.\.\w{4}$/);
  });
});
```

**Task 2B: `/api/presentation/generate`**

- [ ] **Step 1:** `tests/integration/api/presentation/generate.test.ts`
  - Mock OpenAI SDK with `vi.mock('openai')`
  - Send POST with prompt, auth session
  - Expect stream response (`text/event-stream`) or JSON success
  - Test rate limiting hit → 429

**Task 2C: Image generation routes**

- [ ] **`tests/integration/api/image/generate.test.ts`** similar mocks

---

### Task Group 3: E2E Tests (Playwright)

**Task 3A: Auth Flow**

- [ ] `tests/e2e/auth-flow.spec.ts`
  - Visit `/` → redirect to `/auth/signin`
  - Click Google OAuth → (mock OAuth via fixture or skip if OAuth not testable in CI)
  - After sign-in, redirect to `/presentation`

**Task 3B: API Key Modal**

- [ ] `tests/e2e/api-key-modal.spec.ts`
  - Sign in (use test account)
  - Navigate to presentation create page
  - Click "Generate" → modal appears
  - Enter key `sk-test-...` (valid format)
  - Click "Test" → waits for mock validation success
  - Click "Save" → modal closes
  - Click "Generate" again → progress starts

**Mocking OpenAI in E2E:** Use Playwright's `page.route` to intercept `https://api.openai.com/v1/images/generations` and return stubbed JSON. This avoids real API calls.

**Task 3C: Settings Page Key Management**

- [ ] `tests/e2e/settings-key-management.spec.ts`
  - Go to `/settings`
  - Verify masked key visible
  - Click "Change Key" → modal opens
  - Update key → verify updated in DB (query via API)
  - Revoke key → verify removed

**Task 3D: Full Presentation Creation Flow**

- [ ] `tests/e2e/presentation-creation.spec.ts`
  - Topic input
  - Slide count
  - Theme selection
  - Generate → wait for completion
  - Edit a slide
  - Export to PPTX (mock export endpoint or verify file download)

**Task 3E: Export Functionality**

- [ ] `tests/e2e/export-pptx.spec.ts`
- [ ] `tests/e2e/export-pdf.spec.ts`
  - Click export → choose format → verify download starts or preview shows

---

### Task Group 4: Database & Schema Validation

**Task 4A: Prisma schema tests**

- [ ] `tests/unit/prisma/schema-validation.test.ts`
  - Ensure all required indexes defined
  - Check enum values present
  - Validate relation names

- [ ] `tests/integration/db/migration.test.ts`
  - Apply migrations on fresh PostgreSQL (test database)
  - Validate all tables created with correct columns
  - Use `pg_dump` schema comparison or Prisma introspection

**Task 4B: Seed data & fixtures**

Create `tests/fixtures/user.ts`, `presentation.ts` for reuse across tests.

---

### Task Group 5: Coverage Threshold Enforcement

- [ ] **Step 1:** Add `--coverage` to test script

`package.json`:
```json
{
  "scripts": {
    "test": "playwright test --coverage"
  }
}
```

- [ ] **Step 2:** Add coverage threshold to `vitest.config.ts`:

```typescript
export default defineConfig({
  test: {
    coverage: {
      reporter: ["text", "json", "html"],
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

- [ ] **Step 3:** Run full suite; fix any coverage gaps by adding missing tests
- [ ] **Step 4:** Add `coverage:check` pre-commit hook or CI gate

---

## Parallelization with Subagents

Dispatch these subagents concurrently (they're independent):

| Subagent | Assigned Tasks |
|----------|----------------|
| A | Unit tests for lib utilities (rate-limit, modelPicker, crypto) |
| B | Unit tests for components (ApiKeyModal, SettingsPage) |
| C | Integration tests for API routes (user/api-key, presentation/generate) |
| D | E2E tests: auth flow, modal flow, settings flow |
| E | Database schema validation & migration tests |
| F | Coverage threshold setup + gap analysis |

**Batch size:** Groups A–D can run truly parallel (different file sets). E & F sequential after initial results.

---

## Expected Test Count & Runtime

- Unit tests: ~15 files, ~300 tests, ~5 min
- Integration: ~8 files, ~100 tests, ~10 min (with DB)
- E2E: ~6 specs, ~40 tests, ~15 min (with browser)
- Total: ~450 tests; target full suite <30 min in CI

---

## Self-Review

- [ ] All tests pass locally
- [ ] Coverage ≥90% across statements/branches/functions
- [ ] CI pipeline includes coverage job with threshold gate
- [ ] No `test.only` or `skip` left in committed tests
- [ ] External API calls mocked in unit/integration tests
- [ ] E2E tests use deterministic fixtures and cleanup after themselves

---

**Plan Status:** Ready for execution  
**Estimated Duration:** 2–3 days  
**Dependencies:** Plan B (API key modal) completed before most E2E tests can be written
