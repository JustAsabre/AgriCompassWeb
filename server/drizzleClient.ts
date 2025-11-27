import { createRequire } from 'module';
import { drizzle as createDrizzle } from 'drizzle-orm/node-postgres';
import { pool } from './db';

let dbClient: ReturnType<typeof createDrizzle> | null = null;
if (pool) {
  dbClient = createDrizzle(pool as any);
}

export { dbClient as db };
