import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { log } from "./log";
import sessionMiddleware, { sessionStore } from "./session";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import mongoSanitize from "express-mongo-sanitize";
import path from "path";
import { Server } from "socket.io";
import { createServer } from "http";
import { registerRoutes } from "./routes";
import { startProcessing as startPayoutProcessing } from './jobs/payoutQueue';
import { initializeSocket } from "./socket";
import cors from "cors";
// csurf is optional in case the dependency is not installed in some dev/test setups

const app = express();
const httpServer = createServer(app);

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
const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow localhost for development
    if (origin.includes('localhost')) return callback(null, true);
    
    // Allow Vercel deployment
    if (origin.includes('vercel.app')) return callback(null, true);
    
    // Allow Fly.io domain
    if (origin.includes('agricompassweb.fly.dev')) return callback(null, true);
    
    // In production, you might want to restrict to specific domains
    // For now, allow all origins in development
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    // Reject other origins in production
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true, // Allow cookies and authentication headers
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Requested-With']
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
  max: 100, // Limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'test' ? 1000 : 5, // Allow more requests in test mode
  message: "Too many login attempts, please try again later.",
  skipSuccessfulRequests: true,
});

app.use('/api/', limiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Session configuration (centralized)
app.use(sessionMiddleware);

// CSRF protection - ensure it sits after session middleware
// We use a dynamic import here to avoid static import resolution failing when `csurf` is not installed.
// Note: install `csurf` for production deployments where CSRF protection is required.
async function maybeEnableCsrf() {
  let csrfEnabled = false;
  try {
    const csurfModule = await import('csurf');
    const csurfFn = (csurfModule as any).default || csurfModule;
    const useCookie = process.env.CSRF_USE_COOKIE === 'true';
    // If running in cross-origin hosting scenario, cookie-based CSRF will be easier to
    // use for double-submit patterns. Otherwise, default to session-backed tokens.
    const csrfOptions = useCookie
      ? { cookie: { httpOnly: false, secure: process.env.NODE_ENV === 'production', sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax' } }
      : { cookie: false };
    const csrfProtection = csurfFn(csrfOptions as any);
    app.use(csrfProtection);
    csrfEnabled = true;
    console.info(`CSRF middleware enabled (cookie:${useCookie})`);
  } catch (err) {
    console.warn('csurf not installed or failed to initialize - skipping CSRF middleware in this environment.');
  }

  // Always register the endpoint to return JSON so the client and E2E tooling don't receive HTML
  // when a Vite dev middleware falls back to index.html for missing API routes.
  app.get('/api/csrf-token', (req, res) => {
    try {
      // If csurf is enabled, provide the token; otherwise, return null to indicate not available
      if (csrfEnabled) {
        const token = (req as any).csrfToken?.();
        return res.json({ csrfToken: token || null });
      }
      return res.json({ csrfToken: null });
    } catch (err) {
      // In case something went wrong retrieving the token, return a null token rather than HTML
      return res.json({ csrfToken: null });
    }
  });
}

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
    if (proto && proto.split(',')[0] !== 'https') {
      // Redirect to HTTPS
      const host = req.headers.host;
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
  await maybeEnableCsrf();
  // Initialize socket - await to ensure Redis adapter is connected before the app starts
  await initializeSocket(httpServer);
  await registerRoutes(app, httpServer, (await import('./socket')).io);

  // Start any job workers needed (in-memory fallback worker)
  try { startPayoutProcessing(); } catch (err) { console.error('Failed to start payout worker', err); }

  // Specific handler for CSRF errors
  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    if (err && err.code === 'EBADCSRFTOKEN') {
      const rid = (req as any).requestId || '-';
      log(`CSRF error [${rid}] name=${err.name} code=${err.code} message=${err.message}`);
      // Log stack and additional debug info for diagnosing misconfiguration
      try { console.error(err.stack); } catch (e) {}
      return res.status(403).json({ message: 'Invalid CSRF token', requestId: rid });
    }
    _next(err);
  });

  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    const rid = (req as any).requestId || "-";

    // Log the error server-side with request id, don't rethrow to avoid crashing the process
    log(`ERROR [${rid}] ${message} name=${err?.name || ''} code=${err?.code || ''}`);
    try { console.error(err.stack); } catch (e) {}
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
