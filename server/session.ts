import session from "express-session";
import MemoryStore from "memorystore";
import { createRequire } from 'module';

// Optional Postgres-backed session store (connect-pg-simple + pg)
let sessionStore: any = null;
const sessionCookieName = process.env.SESSION_COOKIE_NAME || 'connect.sid';

// If a Postgres connection is provided, use connect-pg-simple with a pg Pool.
// Prefer an explicit PG_CONNECTION_STRING override; otherwise fall back to DATABASE_URL
// to avoid drifting env var requirements between app DB and session store.
const pgSessionConnectionString = process.env.PG_CONNECTION_STRING || process.env.DATABASE_URL;
if (pgSessionConnectionString) {
  try {
    // Use createRequire to synchronously require CommonJS modules in ESM context
    const require = createRequire(import.meta.url);
    const connectPgSimple = require('connect-pg-simple');
    const { Pool } = require('pg');

    const PgSession = connectPgSimple(session as any);
    const pool = new Pool({ connectionString: pgSessionConnectionString });
    // Avoid hard failures when the session table hasn't been provisioned yet.
    // In tests, auto-create the table to keep the environment self-contained.
    const createTableIfMissing =
      process.env.CREATE_SESSION_TABLE_IF_MISSING === 'true' ||
      process.env.NODE_ENV === 'test';

    sessionStore = new PgSession({
      pool,
      tableName: process.env.PG_SESSION_TABLE || 'session',
      createTableIfMissing,
    });
    console.log('Session store: using Postgres (connect-pg-simple)');
  } catch (err) {
    console.error('Error initializing Postgres session store, falling back to MemoryStore', err);
  }
}

// If a Redis connection is provided, prefer Redis as session store
if (!sessionStore && process.env.REDIS_URL) {
  try {
    const require = createRequire(import.meta.url);
    const connectRedisModule = require('connect-redis');
    const redis = require('redis');
    // connect-redis can export either a factory (f(session) => Store) or a Store class / constructor.
    // Support both shapes.
    let RedisStoreCtor: any = null;
    try {
      console.log('connect-redis module info', typeof connectRedisModule, Object.keys(connectRedisModule || {}), connectRedisModule && typeof connectRedisModule.default);
      const tryAsFactory = (fn: any) => {
        try {
          return fn(session as any);
        } catch (err) {
          return null;
        }
      };
      if (typeof connectRedisModule === 'function') {
        // if it's a class (has prototype methods) then use as constructor directly, else try to call as factory
        if (connectRedisModule.prototype && Object.getOwnPropertyNames(connectRedisModule.prototype).length > 1) {
          RedisStoreCtor = connectRedisModule;
        } else {
          RedisStoreCtor = tryAsFactory(connectRedisModule) || connectRedisModule;
        }
      } else if (connectRedisModule && typeof connectRedisModule.default === 'function') {
        const dmod = connectRedisModule.default;
        if (dmod.prototype && Object.getOwnPropertyNames(dmod.prototype).length > 1) {
          RedisStoreCtor = dmod;
        } else {
          RedisStoreCtor = tryAsFactory(dmod) || dmod;
        }
      }
      // If still not resolved, try to see if module has a property 'default' that is a factory/class
      if (!RedisStoreCtor && connectRedisModule && connectRedisModule.default) {
        const dmod = connectRedisModule.default;
        if (typeof dmod === 'function') RedisStoreCtor = tryAsFactory(dmod) || dmod;
      }
    } catch (e) {
      console.warn('Failed to initialize connect-redis module; module shape unexpected', e);
      RedisStoreCtor = null;
    }
    const client = redis.createClient({ 
      url: process.env.REDIS_URL,
      socket: {
        reconnectStrategy: (retries: number) => {
          if (retries > 10) {
            console.error('Redis session store: Max reconnection attempts reached');
            return new Error('Max reconnection attempts reached');
          }
          return Math.min(retries * 100, 3000);
        }
      }
    });
    client.on('error', (err: any) => console.error('Redis session store error:', err.message));
    client.on('reconnecting', () => console.log('Redis session store: Reconnecting...'));
    // Connect in the background; don't block startup
    client.connect().catch((e: any) => console.error('Failed connecting redis client for session store:', e.message));
    if (!RedisStoreCtor) throw new Error('No RedisStore constructor available after inspecting connect-redis export');
    sessionStore = new RedisStoreCtor({ client, prefix: process.env.REDIS_SESSION_PREFIX || 'sess:' });
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
    secure: process.env.NODE_ENV === "production" || !!process.env.FLY_APP_NAME,
    // For cross-site requests (frontend on Vercel talking to API on Fly),
    // browsers require SameSite=None and Secure to send cookies on XHR/fetch.
    // Use 'none' only in production or cloud environments where secure is true.
    sameSite: (process.env.NODE_ENV === "production" || !!process.env.FLY_APP_NAME) ? "none" as const : "lax",
  },
  proxy: true // Trust the reverse proxy when setting secure cookies
});

export default sessionMiddleware;
