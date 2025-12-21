import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import compression from "compression";
import { initSentry, setupSentryErrorHandler } from "./sentry";
import { log } from "./log";
import sessionMiddleware, { sessionStore } from "./session";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import mongoSanitize from "express-mongo-sanitize";
import cookieParser from "cookie-parser";
import path from "path";
import { Server } from "socket.io";
import { createServer } from "http";
import { registerRoutes } from "./routes";
import { startProcessing as startPayoutProcessing } from './jobs/payoutQueue';
import { startPaymentExpirationJob } from './jobs/paymentExpiration';
import { initializeSocket } from "./socket";
import cors from "cors";
import { doubleCsrf } from "csrf-csrf";

const app = express();
const httpServer = createServer(app);

// Initialize Sentry FIRST
initSentry(app);

// Enable gzip/brotli compression for all responses
// This significantly reduces payload size for API responses and static assets
app.use(compression({
  level: 6, // Balanced compression level (1-9, higher = more compression but slower)
  threshold: 1024, // Only compress responses larger than 1KB
  filter: (req, res) => {
    // Don't compress server-sent events
    if (req.headers['accept'] === 'text/event-stream') {
      return false;
    }
    // Use compression filter defaults
    return compression.filter(req, res);
  }
}));

// Configure trust proxy to ensure req.protocol and secure cookies work behind proxies/load-balancers.
// Can be configured via TRUST_PROXY env var. Defaults to 1 (typical single proxy/load-balancer).
{
  const raw = process.env.TRUST_PROXY;
  if (raw !== undefined) {
    // allow values: 'true' (=> 1), numeric string, or other express accepted values
    const val = raw === 'true' ? 1 : (isNaN(Number(raw)) ? raw : Number(raw));
    app.set('trust proxy', val as any);
  } else {
    app.set('trust proxy', 1);
  }
}

// Initialize Socket.IO - moved to IIFE so we can await async setup (e.g., Redis adapter)
// `io` will be exported from `server/socket.ts` after initialization completes

// CORS configuration
// NOTE: With `credentials: true`, CORS must NOT allow arbitrary origins.
// We allowlist trusted frontend origins via env vars.
function getAllowedCorsOrigins() {
  const envList = (process.env.CORS_ALLOWED_ORIGINS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  const frontendUrl = (process.env.FRONTEND_URL || '').trim();

  // Development defaults
  const defaults = process.env.NODE_ENV === 'production'
    ? []
    : [
        'http://localhost:5000',
        'http://127.0.0.1:5000',
        'http://localhost:5173',
        'http://127.0.0.1:5173',
      ];

  return Array.from(new Set([
    ...defaults,
    ...(frontendUrl ? [frontendUrl] : []),
    ...envList,
  ]));
}

function isAllowedOrigin(origin: string) {
  const allowed = getAllowedCorsOrigins();
  if (allowed.includes(origin)) return true;

  // Optional: allow Vercel preview URLs (disabled by default).
  // If enabled, this still scopes to the vercel.app suffix (not ideal, but useful for preview deploys).
  // Prefer explicitly listing preview URLs in CORS_ALLOWED_ORIGINS.
  if (process.env.ALLOW_VERCEL_PREVIEWS === 'true') {
    try {
      const u = new URL(origin);
      if (u.hostname.endsWith('.vercel.app')) return true;
    } catch {
      // ignore
    }
  }

  return false;
}

const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean | string) => void) {
    // Allow requests with no origin (like mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);

    if (isAllowedOrigin(origin)) {
      // Reflect the requesting origin (required for credentialed requests)
      return callback(null, origin);
    }

    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true, // Allow cookies and authentication headers
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Requested-With'],
};

app.use(cors(corsOptions));

// Security middleware
// Helmet sets various HTTP headers for security
app.use(helmet({
  contentSecurityPolicy: false, // Disabled for development - enable in production with proper config
  crossOriginEmbedderPolicy: false,
}));

// Rate limiting to prevent brute force attacks
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 2000, // Increased limit for SPA polling
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'test' ? 1000 : 50, // Allow more login attempts
  message: "Too many login attempts, please try again later.",
  skipSuccessfulRequests: true,
});

app.use('/api/', limiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Session configuration (centralized)
app.use(sessionMiddleware);

// Cookie parser for CSRF token handling
app.use(cookieParser());

// CSRF protection using csrf-csrf (double submit cookie pattern)
const isProduction = process.env.NODE_ENV === 'production';
const isCloud = isProduction || !!process.env.FLY_APP_NAME;
// In production/cloud, do not silently fall back to hardcoded secrets.
const csrfSecret = process.env.CSRF_SECRET || process.env.SESSION_SECRET || (isCloud ? undefined : 'agricompass-csrf-dev-secret');
if (isCloud && !csrfSecret) {
  throw new Error('Missing CSRF_SECRET (or SESSION_SECRET) in production/cloud environment');
}

const {
  invalidCsrfTokenError,
  generateCsrfToken,
  doubleCsrfProtection
} = doubleCsrf({
  getSecret: () => csrfSecret as string,
  getSessionIdentifier: (req: Request) => {
    // Express-session exposes the canonical session id as `req.sessionID`.
    // Falling back to IP makes tokens flaky behind mobile networks/proxies.
    return req.sessionID || req.ip || 'anonymous';
  },
  cookieName: '__csrf',
  cookieOptions: {
    httpOnly: true,
    // Align CSRF cookie policy with the session cookie policy.
    sameSite: isCloud ? 'none' : 'lax',
    secure: isCloud,
    path: '/',
  },
  size: 64,
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
  getCsrfTokenFromRequest: (req: Request) => {
    // Try header first, then body
    return req.headers['x-csrf-token'] as string || (req.body && req.body._csrf);
  },
});

// Skip CSRF for specific routes (webhooks, health checks, auth routes, etc.)
// Auth routes are exempt because they don't have an authenticated session to protect
// and have other protections (rate limiting, email verification)
const csrfExemptRoutes = [
  '/api/webhooks',
  '/api/paystack/webhook',
  '/api/payments/paystack/webhook',
  '/api/health',
  '/__test',
  '/api/auth/register',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/verify-email',
  '/api/auth/resend-verification',
];

const csrfMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Skip CSRF for exempt routes
  const shouldSkip = csrfExemptRoutes.some(route => req.path.startsWith(route));
  if (shouldSkip) {
    return next();
  }
  
  return doubleCsrfProtection(req, res, next);
};

// Apply CSRF protection
app.use(csrfMiddleware);

// CSRF error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err === invalidCsrfTokenError) {
    console.warn(`CSRF token validation failed for ${req.method} ${req.path}`);
    return res.status(403).json({ message: 'Invalid CSRF token. Please refresh the page and try again.' });
  }
  next(err);
});

// Endpoint to get CSRF token
app.get('/api/csrf-token', (req, res) => {
  try {
    const token = generateCsrfToken(req, res);
    return res.json({ csrfToken: token });
  } catch (err) {
    console.error('Error generating CSRF token:', err);
    return res.status(500).json({ csrfToken: null, message: 'Failed to generate CSRF token' });
  }
});

console.info('CSRF protection ENABLED using double submit cookie pattern');

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}
app.use(express.json({
  limit: '10mb', // Limit request body size
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(process.cwd(), 'server', 'uploads')));

// Sanitize user input to prevent NoSQL injection
app.use(mongoSanitize());

// Enforce HTTPS in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol;
    const host = req.headers.host || '';
    // Only redirect to HTTPS if not localhost or 127.0.0.1
    const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1');
    if (proto && proto.split(',')[0] !== 'https' && !isLocalhost) {
      if (host) {
        return res.redirect(`https://${host}${req.url}`);
      }
    }
    next();
  });
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Attach a lightweight request id for tracking in logs and responses
app.use((req, res, next) => {
  const rid = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  (req as any).requestId = rid;
  res.setHeader('X-Request-Id', rid);
  next();
});

(async () => {
  // Initialize socket - await to ensure Redis adapter is connected before the app starts
  await initializeSocket(httpServer);
  await registerRoutes(app, httpServer, (await import('./socket')).io);

  // Start any job workers needed (in-memory fallback worker)
  try { startPayoutProcessing(); } catch (err) { console.error('Failed to start payout worker', err); }
  
  // Start payment expiration job (runs daily at 3 AM)
  try { startPaymentExpirationJob(); } catch (err) { console.error('Failed to start payment expiration job', err); }

  // Sentry error handler - MUST be after all routes but before other error handlers
  setupSentryErrorHandler(app);

  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    const rid = (req as any).requestId || "-";

    // Log the error server-side with request id, don't rethrow to avoid crashing the process
    log(`ERROR [${rid}] ${message} name=${err?.name || ''} code=${err?.code || ''}`);
    try { console.error(err.stack); } catch (e) { }
    if (err.stack) {
      // keep stack printing limited in dev
      if (process.env.NODE_ENV === "development") {
        console.error(err.stack);
      }
    }

    res.status(status).json({ message, requestId: rid });
  });

  // only setup vite when explicitly running in development mode
  // (so `npm start` without NODE_ENV won't accidentally enable dev middleware)
  const isDevelopment = process.env.NODE_ENV === "development";
  if (isDevelopment) {
    const { setupVite } = await import("./vite");
    await setupVite(app, httpServer);
  } else {
    const { serveStatic } = await import("./vite");
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  httpServer.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
  });
})();
