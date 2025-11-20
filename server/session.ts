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
