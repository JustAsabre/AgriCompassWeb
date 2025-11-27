import { createRequire } from 'module';

// The `pg` package is published as CommonJS and may not provide named ESM exports when imported
// via `import *` in an ESM loader. Use `createRequire` to require the package in a way that works
// in Node's ESM runtime and avoids the 'pg.Pool is not a constructor' TypeError.
const require = createRequire(import.meta.url);
let pool: any | null = null;
if (process.env.DATABASE_URL) {
  try {
    const { Pool } = require('pg');
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    console.log('Postgres pool created for DB-level analytics');
  } catch (err) {
    console.error('Error creating Postgres pool for DB-level analytics', err);
    pool = null;
  }
} else {
  console.log('No DATABASE_URL configured; DB-level analytics disabled, falling back to in-memory storage');
}

export { pool };
