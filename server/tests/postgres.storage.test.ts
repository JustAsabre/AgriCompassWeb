import { describe, test, expect } from 'vitest';
import { storage as memOrPgStorage } from '../storage';

describe('PostgresStorage smoke tests', () => {
  test('skip when DATABASE_URL not set', () => {
    if (!process.env.DATABASE_URL) {
      // If DB isn't configured, skip this test
      expect(true).toBe(true);
      return;
    }
    // If DB configured, ensure storage is Postgres-based
    const name = (memOrPgStorage as any).constructor?.name;
    expect(name).toBe('PostgresStorage');
  });
});
