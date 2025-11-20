import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import sessionMiddleware, { sessionStore } from "./session";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import mongoSanitize from "express-mongo-sanitize";
import path from "path";
import { Server } from "socket.io";
import { createServer } from "http";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { initializeSocket } from "./socket";

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

// Initialize Socket.IO
export const io = initializeSocket(httpServer);

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
  max: 5, // Limit each IP to 5 login attempts per windowMs
  message: "Too many login attempts, please try again later.",
  skipSuccessfulRequests: true,
});

app.use('/api/', limiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Session configuration (centralized)
app.use(sessionMiddleware);

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
  await registerRoutes(app, httpServer, io);

  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    const rid = (req as any).requestId || "-";

    // Log the error server-side with request id, don't rethrow to avoid crashing the process
    log(`ERROR [${rid}] ${message}`);
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
    await setupVite(app, httpServer);
  } else {
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
