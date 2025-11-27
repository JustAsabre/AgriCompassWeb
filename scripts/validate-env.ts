#!/usr/bin/env tsx
import 'dotenv/config';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { Pool } = require('pg');

function mask(s?: string) {
  if (!s) return 'MISSING';
  if (s.length <= 8) return '*'.repeat(s.length);
  return s.slice(0, 4) + '...' + s.slice(-4);
}

async function validate() {
  const { DATABASE_URL, REDIS_URL, SESSION_SECRET, PAYSTACK_WEBHOOK_SECRET } = process.env;

  console.log('ENV file summary');
  console.log('--------------------');
  console.log(`DATABASE_URL: ${DATABASE_URL ? 'present' : 'missing'}`);
  console.log(`REDIS_URL: ${REDIS_URL ? 'present' : 'missing'}`);
  console.log(`SESSION_SECRET: ${SESSION_SECRET ? 'present' : 'missing'}`);
  console.log(`PAYSTACK_WEBHOOK_SECRET: ${PAYSTACK_WEBHOOK_SECRET ? 'present' : 'missing'}`);

  if (!DATABASE_URL) {
    console.warn('DATABASE_URL is missing; app will fallback to MemStorage. Provide DATABASE_URL for Postgres storage.');
  } else {
    console.log('Attempting to validate Postgres connectivity...');
    try {
      const pool = new Pool({ connectionString: DATABASE_URL });
      const res = await pool.query('SELECT 1 as ok');
      console.log('Postgres connection test:', res?.rows?.[0]?.ok === 1 ? 'OK' : `Unexpected result: ${JSON.stringify(res?.rows)}`);
      await pool.end();
    } catch (err: any) {
      console.error('Postgres connection failed:', err.message || err);
    }
  }

  if (!REDIS_URL) {
    console.warn('REDIS_URL not set; session store will use MemoryStore. For production, set REDIS_URL.');
  } else {
    console.log('Attempting to validate Redis connectivity...');
    try {
      // If the var accidentally contains a duplicate prefix like "REDIS_URL=rediss://...", normalize
      let url = REDIS_URL;
      if (url.startsWith('REDIS_URL=')) url = url.split('=')[1];
      try {
        // Try to dynamically import redis and connect
        const { createClient } = await import('redis');
        const client = createClient({ url });
        client.on('error', (err) => {});
        await client.connect();
        const pong = await client.ping();
        console.log('Redis ping:', pong === 'PONG' || pong === 'OK' ? 'OK' : `Unexpected: ${String(pong)}`);
        await client.disconnect();
      } catch (rcErr) {
        console.warn('Redis client package not installed or failed to import. Skipping Redis connectivity check. Install `redis` package to check connectivity.', rcErr.message || rcErr);
      }
    } catch (err: any) {
      console.error('Redis connection failed:', err.message || err);
    }
  }

  if (!SESSION_SECRET || (SESSION_SECRET && SESSION_SECRET === 'agricompass-dev-secret-change-in-production')) {
    console.warn('SESSION_SECRET is not set or is default. Use a strong secret in production.');
  } else {
    console.log('SESSION_SECRET: looks set');
  }

  if (!PAYSTACK_WEBHOOK_SECRET) {
    console.warn('PAYSTACK_WEBHOOK_SECRET missing — webhooks may be insecure until set.');
  }
}

validate()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Validation script failed', err);
    process.exit(1);
  });
