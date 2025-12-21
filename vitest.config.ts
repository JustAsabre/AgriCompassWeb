import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    globalSetup: ['./server/tests/globalSetup.ts'],
    // IMPORTANT: Server tests share a single Postgres test DB and many suites call `storage.cleanup()`.
    // Running test files in parallel causes cross-file race conditions (e.g., users disappearing
    // between register -> verify -> login). Disable file parallelism for deterministic, realistic
    // integration testing.
    fileParallelism: false,
    // Use jsdom for client tests, node for server tests
    environmentMatchGlobs: [
      ['client/src/**', 'jsdom'],
      ['server/**', 'node'],
    ],
    // Only include our project's test files and exclude node_modules/.trash
    include: [
      'client/src/**/*.{test,spec}.{ts,tsx,js,jsx}',
      'server/**/*.{test,spec}.{ts,tsx,js,jsx}'
    ],
    // Exclude trash folders and dependencies from collection
    exclude: ['**/.trash/**', 'node_modules/**'],
    setupFiles: ['./server/tests/setup.ts', './client/src/tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.config.{js,ts}',
        '**/tests/**',
        '**/*.test.{ts,tsx}',
        '**/types.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './client/src'),
      '@shared': path.resolve(__dirname, './shared'),
    },
  },
});
