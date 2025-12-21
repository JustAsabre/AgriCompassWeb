import { beforeAll, beforeEach, afterAll } from 'vitest';

// Mock environment variables for testing
beforeAll(() => {
  process.env.NODE_ENV = 'test';
  process.env.ENABLE_TEST_ENDPOINTS = process.env.ENABLE_TEST_ENDPOINTS || 'true';
  process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'test-secret-key-for-testing-only';
  process.env.CSRF_SECRET = process.env.CSRF_SECRET || 'test-csrf-secret-key-for-testing-only';

  // Ensure tests prefer a dedicated DB. The global setup should already set DATABASE_URL.
  // Keep this as a last-resort fallback so local runs still work even if globalSetup is skipped.
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = 'postgresql://agricompass:agricompass@localhost:5432/agricompass_test';
  }
});

// Many server test suites use fixed emails (e.g., login@example.com). Because we run against a real
// shared Postgres test DB, we must isolate tests to avoid duplicate-email collisions and data leakage.
//
// IMPORTANT: Do NOT run DB cleanup in the jsdom environment (client tests), to avoid unnecessary
// DB connections and flakiness.
beforeEach(async () => {
  if (typeof window !== 'undefined') return;

  // Dynamic import keeps client tests from eagerly loading server modules.
  const { storage } = await import('../storage');
  if (storage && typeof (storage as any).cleanup === 'function') {
    await (storage as any).cleanup();
  }
});

afterAll(() => {
  // Cleanup
});
