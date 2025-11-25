import session from "express-session";
import MemoryStore from "memorystore";
import { createRequire } from 'module';

// Optional Postgres-backed session store (connect-pg-simple + pg)
let sessionStore: any = null;
const sessionCookieName = process.env.SESSION_COOKIE_NAME || 'connect.sid';

// If a Postgres connection is provided, use connect-pg-simple with a pg Pool
if (process.env.PG_CONNECTION_STRING) {
  try {
    // Use createRequire to synchronously require CommonJS modules in ESM context
    const require = createRequire(import.meta.url);
    const connectPgSimple = require('connect-pg-simple');
    const { Pool } = require('pg');

    const PgSession = connectPgSimple(session as any);
    const pool = new Pool({ connectionString: process.env.PG_CONNECTION_STRING });
    sessionStore = new PgSession({ pool, tableName: process.env.PG_SESSION_TABLE || 'session' });
    console.log('Session store: using Postgres (connect-pg-simple)');
  } catch (err) {
    console.error('Error initializing Postgres session store, falling back to MemoryStore', err);
  }
}

// If a Redis connection is provided, prefer Redis as session store
if (!sessionStore && process.env.REDIS_URL) {
  try {
    const require = createRequire(import.meta.url);
    const connectRedis = require('connect-redis');
    const redis = require('redis');
    const RedisStore = connectRedis(session as any);
    const client = redis.createClient({ url: process.env.REDIS_URL });
    client.on('error', (err: any) => console.error('Redis client error', err));
    // Connect in the background; don't block startup
    client.connect().catch((e: any) => console.error('Failed connecting redis client for session store', e));
    sessionStore = new RedisStore({ client, prefix: process.env.REDIS_SESSION_PREFIX || 'sess:' });
    console.log('Session store: using Redis');
  } catch (err) {
    console.warn('Redis session store not available, falling back to other session stores', err);
  }
}

// Fallback to in-memory store
if (!sessionStore) {
  const SessionStore = MemoryStore(session as any);
  sessionStore = new SessionStore({ checkPeriod: 86400000 });
  console.log('Session store: using in-memory MemoryStore');
}

export { sessionStore, sessionCookieName };

export const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || "agricompass-dev-secret-change-in-production",
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  }
});

export default sessionMiddleware;
