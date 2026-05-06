# Refactor AI Generation to Use Per-User API Keys

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modify all AI generation server actions and API routes to use per-user OpenAI API keys (from encrypted DB or client-provided) instead of the default single `OPENAI_API_KEY` environment variable.

**Architecture:** Introduce a `getUserApiKey(userId: string)` helper that returns the user's decrypted key or null. Update all generation endpoints to call this helper and fall back to `env.OPENAI_API_KEY` only if no user key exists. Support client-provided key in request payload as immediate override.

**Tech Stack:** Prisma (query user), Node.js `crypto` (decrypt), OpenAI SDK v6, Next.js Server Actions & API Routes

---

## Files to Modify

| File | Responsibility | Change Type |
|------|----------------|-------------|
| `src/lib/crypto/key-encryption.ts` | Decrypt stored API keys | New (already created in Plan B) |
| `src/server/db.ts` or `src/lib/supabase/server.ts` | Prisma client instance | Ensure exported |
| `src/app/_actions/image/generate.ts` | Image generation for slides | Modify: use per-user key |
| `src/app/_actions/presentation/generate/route.ts` | Text generation for presentations | Modify: use per-user key |
| `src/app/_actions/presentation/generate-slide-image.ts` (if exists) | Slide-specific image generation | Modify: use per-user key |
| `src/app/_actions/apps/image-studio/generate.ts` | Image studio generation | Modify: use per-user key |
| `src/components/presentation/shared/SharedGenerateControls.tsx` | UI button disabling logic | Modify: show modal if no key |
| `src/lib/openai/client.ts` (new) | Centralized OpenAI client factory | Create: abstracts key resolution |

**Note:** Files identified per MIGRATION_SUMMARY as using FAL AI have already been cleaned; they already use `openai` package. This refactor simply swaps the API key source.

---

## Data Flow

**Before:**
```
Server Action → OpenAI({ apiKey: env.OPENAI_API_KEY })
```

**After:**
```
Server Action → getUserApiKey(userId) → { key } OR fallback to env
                  ↓
           OpenAI({ apiKey: key })
```

Fallback chain:
1. **Client override:** If request body contains `apiKeyOverride`, use that (for client-only storage mode)
2. **Server decrypted key:** Query `users.openaiApiKeyEncrypted`, decrypt with `key-encryption.decryptApiKey`
3. **Default env key:** Use `OPENAI_API_KEY` (legacy, shared across all users without keys)

---

## Tasks

### Task 1: Create OpenAI Client Utility

**Files:**
- Create: `src/lib/openai/client.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/lib/openai-client.test.ts`:

```typescript
import { getOpenAIClient } from "@/lib/openai/client";
import { OpenAI } from "openai";

// Mock dependencies
vi.mock("@/lib/crypto/key-encryption", () => ({
  decryptApiKey: vi.fn(),
}));
vi.mock("@/server/db", () => ({
  db: { user: { findUnique: vi.fn() } },
}));

describe("getOpenAIClient", () => {
  it("returns OpenAI client with user's decrypted key", async () => {
    // Arrange
    const userId = "user-123";
    const encrypted = "encrypted...";
    const iv = "iv...";
    const plaintext = "sk-test-key";

    // Mock DB query
    db.user.findUnique = vi.fn().mockResolvedValue({
      openaiApiKeyEncrypted: encrypted,
      openaiApiKeyIv: iv,
    });

    // Mock decryption
    decryptApiKey = vi.fn().mockResolvedValue(plaintext);

    // Act
    const client = await getOpenAIClient(userId);

    // Assert
    expect(decryptApiKey).toHaveBeenCalledWith(encrypted, userId, iv);
    expect(client).toBeInstanceOf(OpenAI);
    // Can't directly inspect API key; instead verify constructor called with it
  });

  it("falls back to env key if user has no stored key", async () => {
    db.user.findUnique = vi.fn().mockResolvedValue(null);
    const client = await getOpenAIClient("user-456");
    expect(client).toBeDefined();
  });
});
```

Run: `pnpm test tests/unit/lib/openai-client.test.ts` → FAIL (module not found).

- [ ] **Step 2: Implement minimal getOpenAIClient**

`src/lib/openai/client.ts`:
```typescript
import OpenAI from "openai";
import { decryptApiKey } from "@/lib/crypto/key-encryption";
import { db } from "@/server/db";
import { env } from "@/env";

export async function getOpenAIClient(userId: string): Promise<OpenAI> {
  // Look up user's encrypted key
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { openaiApiKeyEncrypted: true, openaiApiKeyIv: true },
  });

  let apiKey: string;

  if (user?.openaiApiKeyEncrypted && user.openaiApiKeyIv) {
    // Decrypt and use
    apiKey = await decryptApiKey(user.openaiApiKeyEncrypted, userId, user.openaiApiKeyIv);
  } else {
    // Fall back to shared env key
    apiKey = env.OPENAI_API_KEY;
  }

  return new OpenAI({ apiKey, dangerouslyAllowBrowser: false });
}
```

- [ ] **Step 3: Run test → PASS**

Expect all tests pass.

- [ ] **Step 4: Refactor for testability (extract key resolution)**

Factor out `resolveUserApiKey(userId)` for easier unit testing.

```typescript
export async function resolveUserApiKey(userId: string): Promise<string | null> {
  const user = await db.user.findUnique({ ... });
  if (user?.openaiApiKeyEncrypted && user.openaiApiKeyIv) {
    return await decryptApiKey(user.openaiApiKeyEncrypted, userId, user.openaiApiKeyIv);
  }
  return null;
}

export async function getOpenAIClient(userId: string): Promise<OpenAI> {
  const apiKey = (await resolveUserApiKey(userId)) || env.OPENAI_API_KEY;
  return new OpenAI({ apiKey });
}
```

Add tests for `resolveUserApiKey` separately.

- [ ] **Step 5: Commit**

```bash
git add src/lib/openai/client.ts tests/unit/lib/openai-client.test.ts
git commit -m "feat: add getUserApiKey resolver for per-user OpenAI keys"
```

**Expected:** Utility functions ready; tests passing.

---

### Task 2: Refactor Image Generation Action

**File:** `src/app/_actions/image/generate.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/app/_actions/image/generate.test.ts`:

Mock `getOpenAIClient`, test that:
- When `session.user.id` present → calls `getOpenAIClient(userId)`
- When `apiKeyOverride` provided in FormData → uses that key directly
- Falls back to `env.OPENAI_API_KEY` when no user key

```typescript
import { generateImageAction } from "@/app/_actions/image/generate";
import { getOpenAIClient } from "@/lib/openai/client";

vi.mock("@/lib/openai/client");

describe("generateImageAction", () => {
  const userId = "test-user";
  const mockSession = { user: { id: userId } };

  it("uses OpenAI client with user's API key", async () => {
    vi.mocked(getOpenAIClient).mockResolvedValue({
      images: { generate: vi.fn().mockResolvedValue({ data: [{ url: "https://..." }] }) },
    } as any);

    const result = await generateImageAction("test prompt", { session: mockSession as any });

    expect(getOpenAIClient).toHaveBeenCalledWith(userId);
  });
});
```

- [ ] **Step 2: Modify action to accept client key & use getUserApiKey**

Edit `src/app/_actions/image/generate.ts`:

Current signature: `export async function generateImageAction(prompt: string, model = "dall-e-3")`

New: `export async function generateImageAction(prompt: string, { session, apiKeyOverride }: { session: any; apiKeyOverride?: string } = {})`

Implementation:
```typescript
let apiKey = apiKeyOverride;

if (!apiKey && session?.user?.id) {
  const resolved = await resolveUserApiKey(session.user.id);
  if (resolved) apiKey = resolved;
}

if (!apiKey) {
  apiKey = env.OPENAI_API_KEY;
}

const openai = new OpenAI({ apiKey });
```

- [ ] **Step 3: Update all call sites**

Find where `generateImageAction` is called (in components like `SharedGenerateControls`, `ImageControls`). Pass `session` from Server Action context and optionally client-provided key (from localStorage client reads? Actually client can't pass session directly; need to use `auth()` inside action.)

Better approach: Inside the server action, call `auth()` to get session internally (already done in other actions?). Let me check current pattern:

Looking at `src/app/_actions/image/generate.ts` from earlier read: it uses `const session = await auth()` — so session available inside. That's perfect. Just add optional `apiKeyOverride` parameter to action, and if present use that before DB lookup.

Update callers to include `apiKeyOverride` if available.

- [ ] **Step 4: Write integration test**

With real Prisma (if DB available) or mocked, test end-to-end action logic using supertest or direct module import.

- [ ] **Step 5: Run tests → GREEN** then commit.

**Expected:** Image generation now respects per-user keys.

---

### Task 3: Refactor Presentation Text Generation Route

**File:** `src/app/api/presentation/generate/route.ts`

- [ ] **Step 1: Write failing test**

Similar pattern: mock `resolveUserApiKey`, verify it's called when session exists.

- [ ] **Step 2: Update route to use `getOpenAIClient`**

Replace:
```typescript
import OpenAI from "openai";
const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
```

With:
```typescript
import { getOpenAIClient } from "@/lib/openai/client";
const session = await auth();
const openai = await getOpenAIClient(session?.user?.id);
```

- [ ] **Step 3: Update any other AI routes**

Similar files:
- `src/app/api/presentation/outline/route.ts`
- `src/app/api/presentation/prompt-to-diagram/route.ts` (if uses OpenAI)

Apply same pattern.

- [ ] **Step 4: Run tests → GREEN** then commit.

---

### Task 4: Update UI Controls to Check for Key Presence

**File:** `src/components/presentation/shared/SharedGenerateControls.tsx`

- [ ] **Step 1: Identify generate buttons**

This component includes "Generate" triggers for AI operations.

- [ ] **Step 2: Add check: if no API key detected, show modal instead**

```typescript
"use client";
import { useAuth } from "@/components/supabase-provider";
import { useCallback } from "react";
import ApiKeyModal from "@/components/settings/ApiKeyModal";

export function SharedGenerateControls() {
  const { user } = useAuth();
  const [showKeyModal, setShowKeyModal] = useState(false);

  const handleGenerate = async () => {
    const hasKey = await hasApiKey(); // check localStorage or user.storedKey
    if (!hasKey) {
      setShowKeyModal(true);
      return;
    }
    // proceed with generation
  };

  return (
    <>
      <Button onClick={handleGenerate}>Generate</Button>
      <ApiKeyModal open={showKeyModal} onClose={() => setShowKeyModal(false)} />
    </>
  );
}
```

Refactor `hasApiKey()` into a utility: `src/lib/key-storage.ts` → `hasApiKey()`.

- [ ] **Step 3: Write component test**

Test that clicking Generate with no key opens modal; with key proceeds.

- [ ] **Step 4: Verify visually in dev (manual)** then commit.

---

### Task 5: Global API Key Hook (Optional but Recommended)

**New:** `src/hooks/useApiKey.ts`

Provide reactive API key state across app:
```typescript
export function useApiKey(): { key: string | null; setKey: (k: string) => void; clear: () => void } {
  const [key, setKeyState] = useState<string | null>(null);
  // sync with localStorage
}
```

Consume in settings page and controls.

Write tests for hook behavior (React Testing Library).

---

### Task 6: E2E Integration Test

**File:** `tests/e2e/api-key-flow.spec.ts`

**Scenario:** 
1. Sign in with test account
2. Navigate to presentation creation page
3. Click "Generate" → modal appears
4. Enter valid test API key (sk-... from env `TEST_OPENAI_KEY` if provided, else mock simulated success via intercept)
5. Click "Save" → modal closes
6. Generation proceeds → wait for completion
7. Verify presentation created with AI content

Use Playwright's `page.route` to intercept OpenAI API calls and mock responses to avoid real API usage in E2E.

- [ ] **Step 1:** Write test skeleton with mocked network
- [ ] **Step 2:** Implement modal interaction steps
- [ ] **Step 3:** Run → PASS

**Note:** Since live OpenAI key billing limit is reached, mocking is essential for E2E.

---

## Testing Summary

| Test Type | Files | Coverage |
|-----------|-------|----------|
| Unit | crypto, key-storage, openai-client, generate actions | All logic paths |
| Integration | API routes `/api/user/api-key`, generation endpoints with real DB | Auth + storage |
| E2E | Modal flow, settings management, generation triggers | Critical user journeys |

---

## Error Handling Enhancements

**Add to generation actions:**

```typescript
try {
  const openai = await getOpenAIClient(userId);
  // use client
} catch (error) {
  if (error instanceof Error && error.message.includes("decryption")) {
    // Fallback to env key, log warning, alert user via toast?
    // Provide actionable error: "Your saved API key could not be decrypted. Please re-enter it in Settings."
  }
  throw error;
}
```

---

## Self-Check Before Merge

- [ ] All unit tests pass (`pnpm test tests/unit/...`)
- [ ] All E2E tests pass with mocked API
- [ ] No console errors during modal interactions
- [ ] Settings page loads masked key correctly
- [ ] API routes return proper HTTP status codes (200, 400, 401, 500)
- [ ] Encryption: stored values are non-plaintext in DB (spot-check in Supabase)
- [ ] Fallback to env key works when user has no key (but modal should intercept before generation)

---

## Rollback

If this breaks generation for existing users:
- Revert commit
- Clients with localStorage key still have it; server fallback to env key resumes
- No data loss

---

**Duration:** ~2 days with parallel subagents (outlined in tasks above)  
**Blocks:** Depends on Plan B's API route implementation  
**Priority:** High — enables app to work with user-provided keys
