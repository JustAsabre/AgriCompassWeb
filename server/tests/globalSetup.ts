import { createRequire } from 'module';
import { spawnSync } from 'child_process';

// Vitest global setup (runs once before all test files)
//
// Responsibilities:
// - Ensure required env vars are set for test execution
// - Ensure a dedicated Postgres test database exists
// - Apply schema via `drizzle-kit push`
//
// Safety notes:
// - We only auto-create/manage databases whose name ends with `_test`.
// - We do NOT drop/reset anything by default.
// - If you explicitly set RESET_TEST_DB=true, we reset the *schema* of the test DB (not the whole DB).

const require = createRequire(import.meta.url);

function getDefaultBaseDatabaseUrl() {
  // Default matches `docker/postgres-compose.yml`
  return 'postgresql://agricompass:agricompass@localhost:5432/agricompass';
}

function toUrl(value: string) {
  // Ensure it parses as a WHATWG URL (postgres connection strings are URL-compatible)
  return new URL(value);
}

async function ensureTestDatabaseExists(baseDatabaseUrl: string, testDbName: string) {
  if (!testDbName.endsWith('_test')) {
    throw new Error(`Refusing to manage non-test database name: ${testDbName}. Expected name to end with _test.`);
  }

  // Extra hardening: avoid SQL identifier injection via a malicious TEST_DATABASE_NAME.
  // This also keeps CREATE DATABASE / CONNECT behavior predictable.
  if (!/^[a-zA-Z0-9_]+$/.test(testDbName)) {
    throw new Error(`Invalid test database name: ${testDbName}. Use only letters, numbers, and underscores.`);
  }

  const { Client } = require('pg') as typeof import('pg');

  const base = toUrl(baseDatabaseUrl);
  const admin = new URL(base.toString());
  // Connect to default "postgres" database to check/create the test db.
  admin.pathname = '/postgres';

  const client = new Client({ connectionString: admin.toString() });
  await client.connect();
  try {
    const shouldReset = (process.env.RESET_TEST_DB || 'false').toLowerCase() === 'true';

    // Ensure DB exists
    const exists = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [testDbName]);
    if (exists.rowCount === 0) {
      // CREATE DATABASE cannot use parameter placeholders.
      await client.query(`CREATE DATABASE ${testDbName}`);
    }

    // Optional: reset schema if explicitly requested
    if (shouldReset) {
      // Terminate existing connections (best effort) so the schema reset succeeds.
      await client.query(
        'SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()',
        [testDbName]
      );

      const resetUrl = new URL(base.toString());
      resetUrl.pathname = `/${testDbName}`;
      const resetClient = new Client({ connectionString: resetUrl.toString() });
      await resetClient.connect();
      try {
        // Reset *schema*, not the whole database.
        await resetClient.query('DROP SCHEMA IF EXISTS public CASCADE;');
        await resetClient.query('CREATE SCHEMA public;');
        await resetClient.query('GRANT ALL ON SCHEMA public TO public;');
      } finally {
        await resetClient.end();
      }
    }
  } finally {
    await client.end();
  }

  const testUrl = new URL(base.toString());
  testUrl.pathname = `/${testDbName}`;
  return testUrl.toString();
}

function runDbPush() {
  // On Windows, spawning `npm.cmd` directly can fail in some environments with EINVAL.
  // Running through the platform shell is more robust.
  const result =
    process.platform === 'win32'
      ? spawnSync(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', 'npm run db:push'], {
          stdio: 'inherit',
          env: process.env,
        })
      : spawnSync('sh', ['-lc', 'npm run db:push'], {
          stdio: 'inherit',
          env: process.env,
        });

  if (result.error) throw result.error;
  if (typeof result.status === 'number' && result.status !== 0) {
    throw new Error(`db:push failed with exit code ${result.status}`);
  }
}

export default async function globalSetup() {
  // Baseline env
  process.env.NODE_ENV = 'test';
  process.env.ENABLE_TEST_ENDPOINTS = 'true';
  process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'test-secret-key-for-testing-only';
  process.env.CSRF_SECRET = process.env.CSRF_SECRET || 'test-csrf-secret-key-for-testing-only';

  // Prefer an explicitly provided test URL, otherwise derive from DATABASE_URL, otherwise fall back.
  const baseDatabaseUrl =
    process.env.TEST_DATABASE_URL ||
    process.env.DATABASE_URL ||
    getDefaultBaseDatabaseUrl();

  const testDbName = process.env.TEST_DATABASE_NAME || 'agricompass_test';

  // Create (if missing) and set DATABASE_URL to the dedicated test DB.
  const testDatabaseUrl = await ensureTestDatabaseExists(baseDatabaseUrl, testDbName);
  process.env.DATABASE_URL = testDatabaseUrl;

  // Apply schema to test DB.
  runDbPush();
}
