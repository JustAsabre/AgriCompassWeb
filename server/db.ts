import * as pg from 'pg';
import { createRequire } from 'module';

let pool: pg.Pool | null = null;
if (process.env.DATABASE_URL) {
  try {
    pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    console.log('Postgres pool created for DB-level analytics');
  } catch (err) {
    console.error('Error creating Postgres pool for DB-level analytics', err);
    pool = null;
  }
} else {
  console.log('No DATABASE_URL configured; DB-level analytics disabled, falling back to in-memory storage');
}

export { pool };
