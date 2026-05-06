# OpenAI API Key Modal and Storage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build client-side localStorage wrapper for OpenAI API key management, modal UI with validation, and settings page to manage the key with encryption preference.

**Architecture:** 
- Key storage utility wraps localStorage for `StoredKey` type (key, storage preference, timestamp)
- Reusable input field component with show/hide toggle and regex validation
- Modal dialog for entering/editing key with test button and server storage checkbox
- Settings page (client component) that fetches masked key from server and allows change/remove
- Unit tests for all new modules using Vitest + React Testing Library

**Tech Stack:**
- TypeScript (strict)
- Next.js App Router (client components for interactivity)
- shadcn/ui components (Dialog, Button, Input, Checkbox, Label, Badge)
- Supabase for user session (via `useAuth`)
- localStorage for client-side key persistence
- Vitest + React Testing Library for unit tests
- Playwright already exists for e2e but unit tests go in `tests/unit/`

---

## Project Setup: Add Unit Testing Framework

**Prerequisite:** The project only has Playwright e2e tests. We need to add Vitest and testing library for unit tests.

### Task 0: Install Vitest and React Testing Library Dependencies

**Files:**
- Modify: `package.json` (add devDependencies)
- Create: `vitest.config.ts` (or `vitest.config.mts`)
- Create: `tests/unit/setup.ts` (test setup file)
- Modify: `tsconfig.json` (add `tsconfig.vitest.json` or extend for tests)

- [ ] **Step 1: Add devDependencies to package.json**

Add to devDependencies:
```json
{
  "vitest": "^1.6.0",
  "@testing-library/react": "^14.2.1",
  "@testing-library/jest-dom": "^6.4.2",
  "@testing-library/user-event": "^14.5.2",
  "jsdom": "^24.0.0",
  "@vitejs/plugin-react": "^4.3.1",
  "unexpected": "^14.0.0"
}
```

Also add a test script: `"test:unit": "vitest"` and `"test:unit:ui": "vitest --ui"`.

- [ ] **Step 2: Create Vitest configuration**

File: `vitest.config.ts` at project root:
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/unit/setup.ts'],
    include: ['tests/unit/**/*.test.{ts,tsx}'],
    coverage: {
      reporter: ['text', 'json', 'html'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

- [ ] **Step 3: Create test setup file**

File: `tests/unit/setup.ts`:
```typescript
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};
global.localStorage = localStorageMock as Storage;

// Reset mocks before each test
beforeEach(() => {
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  localStorageMock.removeItem.mockClear();
  localStorageMock.clear.mockClear();
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
```

- [ ] **Step 4: Update tsconfig for Vitest**

Create `tsconfig.vitest.json` in project root extending base:
```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["tests/unit/**/*.ts", "tests/unit/**/*.tsx"]
}
```

- [ ] **Step 5: Run initial vitest to verify setup**

```bash
pnpm test:unit --run
```

Expected: No tests found (since we haven't written any yet). Configuration should be valid.

- [ ] **Step 6: Commit**

```bash
git add package.json vitest.config.ts tests/unit/setup.ts tsconfig.vitest.json
git commit -m "test: add Vitest and React Testing Library for unit tests"
```

---

## Part 1: Key Storage Utility

### Task 1: Write tests for key-storage.ts

**Files:**
- Test: `tests/unit/lib/key-storage.test.ts`

- [ ] **Step 1: Write failing tests for all exports**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  saveApiKey,
  getApiKey,
  removeApiKey,
  getKeyStoragePreference,
  shouldShowModal,
  getMaskedKey,
} from '@/lib/key-storage';

describe('key-storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('saveApiKey', () => {
    it('saves key with default client storage', () => {
      saveApiKey('sk-testkey123456789012345678901234567890');
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'openai-api-key',
        expect.stringContaining('"key":"sk-testkey123456789012345678901234567890"')
      );
    });

    it('saves key with server storage preference', () => {
      saveApiKey('sk-testkey123456789012345678901234567890', 'server');
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'openai-api-key',
        expect.stringContaining('"storage":"server"')
      );
    });

    it('handles localStorage quota exceeded error gracefully', () => {
      localStorage.setItem.mockImplementationOnce(() => {
        throw new DOMException('Quota exceeded', 'QuotaExceededError');
      });
      expect(() => saveApiKey('sk-testkey')).not.toThrow();
    });
  });

  describe('getApiKey', () => {
    it('returns key when present', () => {
      localStorage.getItem.mockReturnValueOnce(
        JSON.stringify({ key: 'sk-secretkey123456789012345678901234567890', storage: 'client', updatedAt: '2024-01-01T00:00:00Z' })
      );
      expect(getApiKey()).toBe('sk-secretkey123456789012345678901234567890');
    });

    it('returns null when no key stored', () => {
      localStorage.getItem.mockReturnValueOnce(null);
      expect(getApiKey()).toBeNull();
    });
  });

  describe('removeApiKey', () => {
    it('removes key from localStorage', () => {
      removeApiKey();
      expect(localStorage.removeItem).toHaveBeenCalledWith('openai-api-key');
    });
  });

  describe('getKeyStoragePreference', () => {
    it('returns client when key stored with client preference', () => {
      localStorage.getItem.mockReturnValueOnce(
        JSON.stringify({ key: 'sk-key', storage: 'client', updatedAt: new Date().toISOString() })
      );
      expect(getKeyStoragePreference()).toBe('client');
    });

    it('returns server when key stored with server preference', () => {
      localStorage.getItem.mockReturnValueOnce(
        JSON.stringify({ key: 'sk-key', storage: 'server', updatedAt: new Date().toISOString() })
      );
      expect(getKeyStoragePreference()).toBe('server');
    });

    it('defaults to client when storage field missing', () => {
      localStorage.getItem.mockReturnValueOnce(
        JSON.stringify({ key: 'sk-key', updatedAt: new Date().toISOString() })
      );
      expect(getKeyStoragePreference()).toBe('client');
    });
  });

  describe('shouldShowModal', () => {
    it('returns false when key exists', () => {
      localStorage.getItem.mockReturnValueOnce(
        JSON.stringify({ key: 'sk-key', storage: 'client', updatedAt: new Date().toISOString() })
      );
      expect(shouldShowModal()).toBe(false);
    });

    it('returns true when no key present', () => {
      localStorage.getItem.mockReturnValueOnce(null);
      expect(shouldShowModal()).toBe(true);
    });
  });

  describe('getMaskedKey', () => {
    it('returns masked key with last 4 characters', () => {
      localStorage.getItem.mockReturnValueOnce(
        JSON.stringify({ key: 'sk-abcd1234567890EFGH', storage: 'client', updatedAt: new Date().toISOString() })
      );
      expect(getMaskedKey()).toBe('sk-...EFGH');
    });

    it('handles short key gracefully', () => {
      localStorage.getItem.mockReturnValueOnce(
        JSON.stringify({ key: 'sk-short', storage: 'client', updatedAt: new Date().toISOString() })
      );
      expect(getMaskedKey()).toBe('sk-...ort');
    });

    it('returns empty string when no key', () => {
      localStorage.getItem.mockReturnValueOnce(null);
      expect(getMaskedKey()).toBe('');
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test:unit tests/unit/lib/key-storage.test.ts --run
```

Expected: "Cannot find module '@/lib/key-storage'" - this is expected.

- [ ] **Step 3: Write minimal implementation**

**File:** `src/lib/key-storage.ts`
```typescript
const STORAGE_KEY = 'openai-api-key';

export interface StoredKey {
  key: string;
  storage: 'client' | 'server';
  updatedAt: string;
}

export function saveApiKey(key: string, storage: 'client' | 'server' = 'client'): void {
  try {
    const storedKey: StoredKey = {
      key,
      storage,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(storedKey));
  } catch (error) {
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      console.error('LocalStorage quota exceeded:', error);
    } else {
      console.error('Failed to save API key:', error);
    }
  }
}

export function getApiKey(): string | null {
  try {
    const item = localStorage.getItem(STORAGE_KEY);
    if (!item) return null;
    const stored: StoredKey = JSON.parse(item);
    return stored.key;
  } catch {
    return null;
  }
}

export function removeApiKey(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function getKeyStoragePreference(): 'client' | 'server' {
  try {
    const item = localStorage.getItem(STORAGE_KEY);
    if (!item) return 'client';
    const stored: StoredKey = JSON.parse(item);
    return stored.storage || 'client';
  } catch {
    return 'client';
  }
}

export function shouldShowModal(): boolean {
  return !getApiKey();
}

export function getMaskedKey(): string {
  const key = getApiKey();
  if (!key) return '';
  const last4 = key.slice(-4);
  return `sk-...${last4}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test:unit tests/unit/lib/key-storage.test.ts --run
```

Expected: All tests pass.

- [ ] **Step 5: Lint check**

```bash
pnpm lint src/lib/key-storage.ts
```

Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/key-storage.ts
git commit -m "feat: add key-storage utility for OpenAI API key management"
```

---

## Part 2: API Key Input Field Component

### Task 2: Write tests for ApiKeyInputField

**Files:**
- Test: `tests/unit/components/settings/ApiKeyInputField.test.tsx`
- Component: `src/components/settings/ApiKeyInputField.tsx`

- [ ] **Step 1: Write failing tests**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ApiKeyInputField from '@/components/settings/ApiKeyInputField';
import { Eye, EyeOff } from 'lucide-react';

describe('ApiKeyInputField', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('renders input with value', () => {
    render(<ApiKeyInputField value="sk-testkey" onChange={mockOnChange} showToggle={true} />);
    expect(screen.getByDisplayValue('sk-testkey')).toBeInTheDocument();
  });

  it('calls onChange when input changes', async () => {
    const user = userEvent.setup();
    render(<ApiKeyInputField value="" onChange={mockOnChange} showToggle={true} />);
    const input = screen.getByRole('textbox');
    await user.type(input, 'sk-newkey');
    expect(mockOnChange).toHaveBeenCalledWith('sk-newkey');
  });

  it('shows eye icon when showToggle is true and key is hidden', () => {
    render(<ApiKeyInputField value="sk-key" onChange={mockOnChange} showToggle={true} />);
    const toggleButton = screen.getByRole('button', { name: /show/i });
    expect(toggleButton).toBeInTheDocument();
  });

  it('does not show eye icon when showToggle is false', () => {
    render(<ApiKeyInputField value="sk-key" onChange={mockOnChange} showToggle={false} />);
    const toggleButton = screen.queryByRole('button', { name: /show/i });
    expect(toggleButton).not.toBeInTheDocument();
  });

  it('toggles password visibility when eye button clicked', async () => {
    const user = userEvent.setup();
    render(<ApiKeyInputField value="sk-secret" onChange={mockOnChange} showToggle={true} />);
    const input = screen.getByRole('textbox');
    const toggleButton = screen.getByRole('button', { name: /show/i });

    expect(input).toHaveAttribute('type', 'password');
    await user.click(toggleButton);
    expect(input).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: /hide/i })).toBeInTheDocument();
  });

  it('shows error message for invalid key format', () => {
    render(<ApiKeyInputField value="invalid-key" onChange={mockOnChange} showToggle={true} />);
    expect(screen.getByText(/invalid API key format/i)).toBeInTheDocument();
  });

  it('does not show error for valid key format', () => {
    render(<ApiKeyInputField value="sk-ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef12345678" onChange={mockOnChange} showToggle={true} />);
    expect(screen.queryByText(/invalid API key format/i)).not.toBeInTheDocument();
  });

  it('validates OpenAI key regex pattern', () => {
    const validKey = 'sk-ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef12345678';
    const invalidKeys = [
      'sk-short',
      'sk-123',
      'invalid',
      '',
      'sk-' + 'a'.repeat(31),
    ];

    invalidKeys.forEach((invalidKey) => {
      render(<ApiKeyInputField value={invalidKey} onChange={mockOnChange} showToggle={true} />);
      expect(screen.getByText(/invalid API key format/i)).toBeInTheDocument();
    });

    render(<ApiKeyInputField value={validKey} onChange={mockOnChange} showToggle={true} />);
    expect(screen.queryByText(/invalid API key format/i)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify failure**

```bash
pnpm test:unit tests/unit/components/settings/ApiKeyInputField.test.tsx --run
```

Expected: Module not found.

- [ ] **Step 3: Write minimal implementation**

**File:** `src/components/settings/ApiKeyInputField.tsx`
```tsx
import * as React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ApiKeyInputFieldProps {
  value: string;
  onChange: (value: string) => void;
  showToggle?: boolean;
}

const OPENAI_KEY_REGEX = /^sk-[A-Za-z0-9]{32,}$/;

export function ApiKeyInputField({
  value,
  onChange,
  showToggle = true,
}: ApiKeyInputFieldProps) {
  const [showKey, setShowKey] = React.useState(false);
  const isValid = !value || OPENAI_KEY_REGEX.test(value);

  const handleToggle = () => {
    setShowKey(!showKey);
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <Input
          type={showKey ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="sk-..."
          aria-invalid={!isValid}
          className={cn(!isValid && 'border-destructive')}
          autoComplete="off"
        />
        {showToggle && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 h-full px-3 py-2"
            onClick={handleToggle}
            aria-label={showKey ? 'Hide API key' : 'Show API key'}
          >
            {showKey ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>
      {!isValid && value && (
        <p className="text-sm text-destructive">Invalid API key format</p>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test:unit tests/unit/components/settings/ApiKeyInputField.test.tsx --run
```

Expected: All tests pass.

- [ ] **Step 5: Lint and refactor if needed**

```bash
pnpm lint src/components/settings/ApiKeyInputField.tsx
```

Fix any warnings.

- [ ] **Step 6: Commit**

```bash
git add src/components/settings/ApiKeyInputField.tsx
git commit -m "feat: add ApiKeyInputField component with validation and show/hide toggle"
```

---

## Part 3: API Key Modal Component

### Task 3: Write tests for ApiKeyModal

**Files:**
- Test: `tests/unit/components/settings/ApiKeyModal.test.tsx`
- Component: `src/components/settings/ApiKeyModal.tsx`

- [ ] **Step 1: Write failing tests**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ApiKeyModal from '@/components/settings/ApiKeyModal';

// Mock fetch
global.fetch = vi.fn();

// Mock key-storage
vi.mock('@/lib/key-storage', () => ({
  saveApiKey: vi.fn(),
  getApiKey: vi.fn(() => null),
  shouldShowModal: vi.fn(() => true),
}));

describe('ApiKeyModal', () => {
  const mockOnClose = vi.fn();
  const mockOnSave = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders modal when open', () => {
    render(<ApiKeyModal isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/enter your OpenAI API key/i)).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<ApiKeyModal isOpen={false} onClose={mockOnClose} onSave={mockOnSave} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('calls onClose when cancel button clicked', async () => {
    const user = userEvent.setup();
    render(<ApiKeyModal isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />);
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls onClose when escape pressed', async () => {
    render(<ApiKeyModal isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />);
    const dialog = screen.getByRole('dialog');
    fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' });
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('disables save button until key is valid', () => {
    render(<ApiKeyModal isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />);
    const saveButton = screen.getByRole('button', { name: /save/i });
    expect(saveButton).toBeDisabled();
  });

  it('enables save button when key format is valid', async () => {
    const user = userEvent.setup();
    render(<ApiKeyModal isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />);
    const input = screen.getByPlaceholderText(/sk-/i);
    await user.type(input, 'sk-ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef12345678');
    const saveButton = screen.getByRole('button', { name: /save/i });
    expect(saveButton).not.toBeDisabled();
  });

  it('calls onSave with key and storage preference when save clicked', async () => {
    const user = userEvent.setup();
    render(<ApiKeyModal isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />);
    const input = screen.getByPlaceholderText(/sk-/i);
    await user.type(input, 'sk-ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef12345678');

    // Check that server storage is checked by default
    const serverCheckbox = screen.getByLabelText(/save encrypted on server/i);
    expect(serverCheckbox).toBeChecked();

    await user.click(screen.getByRole('button', { name: /save/i }));
    expect(mockOnSave).toHaveBeenCalledWith('sk-ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef12345678', 'server');
  });

  it('calls onSave with client storage when checkbox unchecked', async () => {
    const user = userEvent.setup();
    render(<ApiKeyModal isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />);
    const input = screen.getByPlaceholderText(/sk-/i);
    await user.type(input, 'sk-ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef12345678');

    const clientCheckbox = screen.getByLabelText(/save encrypted on server/i);
    await user.click(clientCheckbox);
    expect(clientCheckbox).not.toBeChecked();

    await user.click(screen.getByRole('button', { name: /save/i }));
    expect(mockOnSave).toHaveBeenCalledWith('sk-ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef12345678', 'client');
  });

  it('shows error when API call fails', async () => {
    // Mock fetch to reject
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Failed'));

    const user = userEvent.setup();
    render(<ApiKeyModal isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />);
    const input = screen.getByPlaceholderText(/sk-/i);
    await user.type(input, 'sk-ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef12345678');

    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(screen.getByText(/failed to save API key/i)).toBeInTheDocument();
    });
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('has proper ARIA attributes for accessibility', () => {
    render(<ApiKeyModal isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-labelledby');
    expect(dialog).toHaveAttribute('aria-describedby');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test:unit tests/unit/components/settings/ApiKeyModal.test.tsx --run
```

Expected: Module not found.

- [ ] **Step 3: Write minimal implementation**

**File:** `src/components/settings/ApiKeyModal.tsx`
```tsx
'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ApiKeyInputField } from './ApiKeyInputField';
import { Loader2 } from 'lucide-react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (key: string, storage: 'client' | 'server') => void;
}

export function ApiKeyModal({
  isOpen,
  onClose,
  onSave,
}: ApiKeyModalProps) {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isValidFormat, setIsValidFormat] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'idle' | 'valid' | 'invalid'>('idle');
  const [preferServerStorage, setPreferServerStorage] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const OPENAI_KEY_REGEX = /^sk-[A-Za-z0-9]{32,}$/;

  const handleKeyChange = (value: string) => {
    setApiKey(value);
    setIsValidFormat(OPENAI_KEY_REGEX.test(value));
    setError(null);
  };

  const handleTestKey = async () => {
    if (!isValidFormat) return;
    setIsTesting(true);
    setTestResult('idle');

    try {
      const response = await fetch('/api/user/api-key/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: apiKey }),
      });

      if (response.ok) {
        setTestResult('valid');
      } else {
        setTestResult('invalid');
      }
    } catch {
      setTestResult('invalid');
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    if (!isValidFormat) return;

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/user/api-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: apiKey,
          storage: preferServerStorage ? 'server' : 'client',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save API key');
      }

      onSave(apiKey, preferServerStorage ? 'server' : 'client');
      setApiKey('');
      setShowKey(false);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save API key');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setApiKey('');
    setShowKey(false);
    setTestResult('idle');
    setError(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md" aria-describedby="api-key-description">
        <DialogHeader>
          <DialogTitle>Enter your OpenAI API key</DialogTitle>
          <DialogDescription id="api-key-description">
            Your API key is required to generate AI-powered presentations.
            It will be stored securely based on your preference.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="api-key-input">API Key</Label>
            <ApiKeyInputField
              value={apiKey}
              onChange={handleKeyChange}
              showToggle={true}
            />
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleTestKey}
            disabled={!isValidFormat || isTesting}
          >
            {isTesting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testing...
              </>
            ) : (
              'Test key'
            )}
          </Button>

          {testResult === 'valid' && (
            <p className="text-sm text-green-600">Key is valid</p>
          )}
          {testResult === 'invalid' && (
            <p className="text-sm text-destructive">Invalid API key</p>
          )}

          <div className="flex items-center space-x-2">
            <Checkbox
              id="server-storage"
              checked={preferServerStorage}
              onCheckedChange={(checked: boolean) => setPreferServerStorage(checked)}
            />
            <Label htmlFor="server-storage" className="text-sm">
              Save encrypted on server
            </Label>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter className="flex flex-row justify-end gap-2 sm:justify-end">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={!isValidFormat || isSaving}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ApiKeyModal;
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test:unit tests/unit/components/settings/ApiKeyModal.test.tsx --run
```

Expected: All tests pass. If any fail, fix implementation.

- [ ] **Step 5: Lint check**

```bash
pnpm lint src/components/settings/ApiKeyModal.tsx
```

Fix any warnings.

- [ ] **Step 6: Commit**

```bash
git add src/components/settings/ApiKeyModal.tsx
git commit -m "feat: add ApiKeyModal component with validation and server storage toggle"
```

---

## Part 4: Settings Page

### Task 4: Write tests for Settings Page

**Files:**
- Test: `tests/unit/app/settings/page.test.tsx`
- Page: `src/app/settings/page.tsx`

- [ ] **Step 1: Write failing tests**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SettingsPage from '@/app/settings/page';

// Mock fetch
global.fetch = vi.fn();

// Mock key-storage
vi.mock('@/lib/key-storage', () => ({
  getMaskedKey: vi.fn(() => 'sk-...ABCD'),
  getKeyStoragePreference: vi.fn(() => 'server'),
}));

// Mock useAuth
vi.mock('@/components/supabase-provider', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: { id: 'user-123' },
  }),
}));

describe('Settings Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders settings page with API key section', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ maskedKey: 'sk-...ABCD', storage: 'server' }),
    });

    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText(/OpenAI API Key/i)).toBeInTheDocument();
    });
  });

  it('displays masked key and storage badge', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ maskedKey: 'sk-...WXYZ', storage: 'server' }),
    });

    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText('sk-...WXYZ')).toBeInTheDocument();
    });
    expect(screen.getByText(/encrypted on server/i)).toBeInTheDocument();
  });

  it('shows local storage badge when storage is client', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ maskedKey: 'sk-...1234', storage: 'client' }),
    });

    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText(/local browser/i)).toBeInTheDocument();
    });
  });

  it('opens modal when change button clicked', async () => {
    const user = userEvent.setup();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ maskedKey: 'sk-...ABCD', storage: 'server' }),
    });

    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText(/Change/i)).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /change/i }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/enter your OpenAI API key/i)).toBeInTheDocument();
  });

  it('removes key when remove button clicked and confirmed', async () => {
    const user = userEvent.setup();
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ maskedKey: 'sk-...ABCD', storage: 'server' }),
      })
      .mockDeleteResponseOnce({ ok: true });

    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /remove/i }));

    // Confirmation dialog should appear
    const confirmBtn = await screen.findByRole('button', { name: /confirm/i });
    await user.click(confirmBtn);

    expect(global.fetch).toHaveBeenCalledWith('/api/user/api-key', expect.objectContaining({
      method: 'DELETE',
    }));
  });

  it('toggles server storage preference', async () => {
    const user = userEvent.setup();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ maskedKey: 'sk-...ABCD', storage: 'client' }),
    });

    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText(/Use encrypted server storage/i)).toBeInTheDocument();
    });

    const toggle = screen.getByRole('switch');
    await user.click(toggle);

    expect(global.fetch).toHaveBeenCalledWith('/api/user/api-key', expect.objectContaining({
      method: 'POST',
    }));
  });

  it('shows warning when client-only storage is selected', async () => {
    const user = userEvent.setup();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ maskedKey: 'sk-...ABCD', storage: 'client' }),
    });

    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText(/Use encrypted server storage/i)).toBeInTheDocument();
    });

    // The toggle should already be off (client storage)
    expect(screen.getByText(/data is stored only in your browser/i)).toBeInTheDocument();
  });

  it('handles fetch error gracefully', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'));

    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText(/failed to load API key/i)).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test:unit tests/unit/app/settings/page.test.tsx --run
```

Expected: Module not found.

- [ ] **Step 3: Write minimal implementation**

**File:** `src/app/settings/page.tsx`
```tsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/supabase-provider';
import { Button } from '@/components/ui/button';
import { ApiKeyModal } from '@/components/settings/ApiKeyModal';
import { Loader2, Key, Shield, AlertTriangle } from 'lucide-react';

interface MaskedKeyResponse {
  maskedKey: string;
  storage: 'client' | 'server';
}

export default function SettingsPage() {
  const { isAuthenticated } = useAuth();
  const [maskedKey, setMaskedKey] = useState<string | null>(null);
  const [storage, setStorage] = useState<'client' | 'server'>('client');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [useServerStorage, setUseServerStorage] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) return;

    async function fetchApiKey() {
      try {
        const response = await fetch('/api/user/api-key');
        if (!response.ok) {
          throw new Error('Failed to load API key');
        }
        const data: MaskedKeyResponse = await response.json();
        setMaskedKey(data.maskedKey);
        setStorage(data.storage);
        setUseServerStorage(data.storage === 'server');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load API key');
      } finally {
        setIsLoading(false);
      }
    }

    fetchApiKey();
  }, [isAuthenticated]);

  const handleSaveKey = async (key: string, storage: 'client' | 'server') => {
    // Refetch the masked key after saving
    try {
      const response = await fetch('/api/user/api-key');
      if (response.ok) {
        const data: MaskedKeyResponse = await response.json();
        setMaskedKey(data.maskedKey);
        setStorage(data.storage);
      }
    } catch {
      // Handle error silently, modal will close anyway
    }
  };

  const handleRemoveKey = async () => {
    setIsRemoving(true);
    try {
      const response = await fetch('/api/user/api-key', {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to remove API key');
      }
      setMaskedKey(null);
      setStorage('client');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove API key');
    } finally {
      setIsRemoving(false);
    }
  };

  const handleToggleStorage = async (checked: boolean) => {
    setUseServerStorage(checked);
    try {
      const response = await fetch('/api/user/api-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storage: checked ? 'server' : 'client',
        }),
      });
      if (!response.ok) {
        throw new Error('Failed to update storage preference');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update preference');
      setUseServerStorage(!checked); // revert
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl py-8">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <section className="space-y-4 rounded-lg border p-6">
        <div className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          <h2 className="text-lg font-semibold">OpenAI API Key</h2>
        </div>

        <p className="text-sm text-muted-foreground">
          Your OpenAI API key is used for AI-powered presentation generation.
          The key is never stored on our servers when using client-side storage.
        </p>

        {error && (
          <div className="rounded-md bg-destructive/10 p-4 text-destructive">
            {error}
          </div>
        )}

        {maskedKey ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <code className="rounded bg-muted px-3 py-2 text-sm font-mono">
                {maskedKey}
              </code>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                storage === 'server'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-blue-100 text-blue-800'
              }`}>
                {storage === 'server' ? (
                  <>
                    <Shield className="mr-1 h-3 w-3" />
                    encrypted on server
                  </>
                ) : (
                  'local browser'
                )}
              </span>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setIsModalOpen(true)}
              >
                Change
              </Button>
              <Button
                variant="destructive"
                onClick={handleRemoveKey}
                disabled={isRemoving}
              >
                {isRemoving ? 'Removing...' : 'Remove'}
              </Button>
            </div>
          </div>
        ) : (
          <Button onClick={() => setIsModalOpen(true)}>
            Add OpenAI API Key
          </Button>
        )}

        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label htmlFor="server-storage-toggle">Use encrypted server storage</Label>
            <p className="text-sm text-muted-foreground">
              When enabled, your key is encrypted and stored securely on our servers
            </p>
          </div>
          <input
            id="server-storage-toggle"
            type="checkbox"
            checked={useServerStorage}
            onChange={(e) => handleToggleStorage(e.target.checked)}
            className="h-5 w-5"
          />
        </div>

        {storage === 'client' && (
          <div className="flex items-center gap-2 rounded-md bg-amber-50 p-4 text-amber-800 dark:bg-amber-950 dark:text-amber-200">
            <AlertTriangle className="h-5 w-5 flex-shrink-0" />
            <p className="text-sm">
              Data is stored only in your browser. Clearing browser data will require
              re-entering your API key.
            </p>
          </div>
        )}
      </section>

      <ApiKeyModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveKey}
      />
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test:unit tests/unit/app/settings/page.test.tsx --run
```

Expected: All tests pass. Fix any failures.

- [ ] **Step 5: Lint check**

```bash
pnpm lint src/app/settings/page.tsx
```

Fix any warnings.

- [ ] **Step 6: Commit**

```bash
git add src/app/settings/page.tsx
git commit -m "feat: add settings page for OpenAI API key management"
```

---

## Part 5: Navigation Integration

### Task 5: Add Settings link to navigation

**Files:**
- Modify: Wherever user menu/profile is shown (likely `PresentationHeader.tsx` or Sidebar component)

- [ ] **Step 1: Find where user profile/menu lives**

Based on code review, `PresentationHeader.tsx` has a commented-out `<SideBarDropdown />`. We need to either:
- Add Settings link to existing help menu dropdown
- Create a user profile dropdown with Settings option
- Add Settings to PresentationMenu

Decision: Add Settings item to `PresentationMenu` (existing dropdown with FolderOpen icon). Alternatively, add to HelpMenu dropdown since it's user-facing.

Since `PresentationMenu` currently has: New Presentation, Rename, Duplicate, Undo/Redo, Page setup, Theme panel, Agent panel, All Presentations — none are user settings. Better to add a separate user menu or include in HelpMenu.

Let's inspect HelpMenu more closely. It currently has "Keyboard shortcuts" and "Visit allweone.com". Add "Settings" item there.

- [ ] **Step 2: Write failing test (optional, if we're adding behavior we can manual test)**

Since this is a minor UI addition and existing component tests exist for HelpMenu, we could add a test. But per spec "≥80% coverage" - this is already covered. We'll add a simple smoke test.

**Test file:** `tests/unit/components/sidebar/help-menu.test.tsx` (create)

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HelpMenu } from '@/components/sidebar/help-menu';

describe('HelpMenu', () => {
  it('includes Settings link in dropdown', () => {
    render(<HelpMenu />);
    // Settings option should appear in dropdown
  });
});
```

Actually, we'll integrate and verify via existing e2e tests, but let's add unit test after implementation.

- [ ] **Step 3: Modify HelpMenu to include Settings link**

**File:** `src/components/sidebar/help-menu.tsx`

Add import:
```tsx
import { Settings } from 'lucide-react';
```

Add menu item before the separator before the ALLWEONE Presentation footer:
```tsx
<DropdownMenuItem asChild>
  <a
    href="/settings"
    className="flex items-center"
  >
    <Settings className="mr-3 h-5 w-5" />
    <span>Settings</span>
  </a>
</DropdownMenuItem>
```

Full modified portion (after Visit allweone.com):
```tsx
<DropdownMenuSeparator />

<DropdownMenuItem asChild>
  <a
    href="/settings"
    className="flex items-center"
  >
    <Settings className="mr-3 h-5 w-5" />
    <span>Settings</span>
  </a>
</DropdownMenuItem>

<div className="px-2 py-2 text-xs text-muted-foreground">
  ALLWEONE Presentation
</div>
```

- [ ] **Step 4: Write test to verify link exists**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HelpMenu } from '@/components/sidebar/help-menu';

describe('HelpMenu', () => {
  it('renders settings link', () => {
    render(<HelpMenu />);
    const settingsLink = screen.getByRole('link', { name: /settings/i });
    expect(settingsLink).toBeInTheDocument();
    expect(settingsLink).toHaveAttribute('href', '/settings');
  });
});
```

- [ ] **Step 5: Run test**

```bash
pnpm test:unit tests/unit/components/sidebar/help-menu.test.tsx --run
```

- [ ] **Step 6: Lint**

```bash
pnpm lint src/components/sidebar/help-menu.tsx
```

- [ ] **Step 7: Commit**

```bash
git add src/components/sidebar/help-menu.tsx
git commit -m "feat: add Settings link to Help menu"
```

---

## Part 6: Settings Page Layout

### Task 6: Create settings page layout wrapper (if needed)

If the settings page needs consistent layout (header, navigation), we may create a layout file. Based on existing patterns, check if other pages have custom layouts.

- [ ] **Step 1: Check if `src/app/settings/layout.tsx` exists**

If the settings page needs the same header/navigation as main app, create layout file to wrap children. Most app pages share the root layout, which includes SupabaseProvider and ThemeProvider but no global navigation header.

Based on the app structure, it seems only presentation pages have special layout. Settings page can be standalone without special layout.

Decision: No layout file needed. Page uses RootLayout.

If needed later, we can create `src/app/settings/layout.tsx` with a basic wrapper.

---

## Part 7: API Routes (Stubs for now)

Since the backend routes are not ready, we need to stub API calls in components with proper error handling. The modal already handles failures and shows error messages. The settings page already has error handling in implementation.

**Note:** The API endpoints that will be used:
- `POST /api/user/api-key` — `{ key, storage }`
- `DELETE /api/user/api-key`
- `GET /api/user/api-key` — returns `{ maskedKey, storage }`
- `POST /api/user/api-key/validate` — returns ok if key valid

These are not built yet, but our frontend code is ready to work with them once deployed.

---

## Integration and Verification

### Task 8: Run full test suite

- [ ] **Step 1: Run all unit tests**

```bash
pnpm test:unit --run
```

Expected: All tests pass with ≥80% coverage. Check coverage report.

- [ ] **Step 2: Run lint across all new files**

```bash
pnpm lint src/lib/key-storage.ts src/components/settings/ src/app/settings/
```

Fix any issues.

- [ ] **Step 3: Type check**

```bash
pnpm type
```

Fix any type errors.

- [ ] **Step 4: Build check**

```bash
pnpm build
```

Ensure no build errors.

- [ ] **Step 5: Final commit**

```bash
git add .
git commit -m "feat: complete OpenAI API key modal and storage system"
```

---

## Summary of Deliverables

- ✅ `src/lib/key-storage.ts` — localStorage wrapper with type safety
- ✅ `src/components/settings/ApiKeyInputField.tsx` — show/hide toggle + validation
- ✅ `src/components/settings/ApiKeyModal.tsx` — full modal with test, save, storage preference
- ✅ `src/app/settings/page.tsx` — settings page client component, fetches masked key, change/remove/toggle
- ✅ Navigation link in `src/components/sidebar/help-menu.tsx` → `/settings`
- ✅ Unit tests in `tests/unit/` with comprehensive coverage (≥80%)
- ✅ Type-safe TypeScript (no `any` warnings)
- ✅ Clean lint
- ✅ Handles quota errors, fetch errors gracefully

---

**Plan complete and saved to `docs/superpowers/plans/2025-05-06-openai-api-key-modal.md`.**

**Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**