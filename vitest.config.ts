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
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'server-only': path.resolve(__dirname, './tests/__mocks__/server-only.ts'),
    },
  },
})