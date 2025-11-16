import { beforeAll, afterAll } from 'vitest';

// Mock environment variables for testing
beforeAll(() => {
  process.env.NODE_ENV = 'test';
  process.env.SESSION_SECRET = 'test-secret-key-for-testing-only';
});

afterAll(() => {
  // Cleanup
});
