/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    // Only run vitest-compatible unit tests. Playwright e2e specs (*.spec.ts)
    // and the jest-based integration test are executed by their own runners.
    include: ['tests/**/*.test.{ts,tsx}'],
    exclude: [
      '**/node_modules/**',
      '**/.kilo/**',
      'tests/integration/api/user/api-key.test.ts',
      'tests/**/*.spec.{ts,tsx}',
    ],
    // Serialize test files: the `key-encryption` suite uses CPU-bound
    // `scryptSync` which, under default file parallelism, starves other
    // forks and causes "Timeout waiting for worker" / test timeouts.
    // Running files sequentially keeps the suite reliable and, in practice,
    // faster end-to-end (the whole suite finishes well under a minute).
    fileParallelism: false,
    // Generous per-test timeout to absorb slow jsdom bootstrap and scrypt.
    testTimeout: 30000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'server-only': path.resolve(__dirname, './tests/__mocks__/server-only.ts'),
    },
  },
})