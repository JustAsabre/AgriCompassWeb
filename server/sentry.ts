import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";
import type { Express } from "express";

/**
 * Initialize Sentry for Node.js backend
 * Error tracking and performance monitoring
 */
export function initSentry(app: Express) {
  const sentryDsn = process.env.SENTRY_DSN;
  const environment = process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || "development";
  
  // Only initialize if DSN is provided
  if (!sentryDsn) {
    console.warn("Sentry DSN not provided - error tracking disabled");
    return;
  }

  Sentry.init({
    dsn: sentryDsn,
    environment,
    
    // Performance Monitoring
    integrations: [
      // Enable HTTP calls tracing
      Sentry.httpIntegration(),
      // Enable Express.js middleware tracing
      Sentry.expressIntegration(),
      // Enable profiling
      nodeProfilingIntegration(),
    ],
    
    // Performance traces sample rate (0.0 - 1.0)
    tracesSampleRate: environment === "production" ? 0.1 : 1.0,
    
    // Profiling sample rate (0.0 - 1.0)
    profilesSampleRate: environment === "production" ? 0.1 : 1.0,
    
    // Filter out sensitive data
    beforeSend(event) {
      // Don't send events in development unless explicitly enabled
      if (environment === "development" && !process.env.SENTRY_DEBUG) {
        return null;
      }
      
      // Remove sensitive data from events
      if (event.request) {
        delete event.request.cookies;
        if (event.request.headers) {
          delete event.request.headers.authorization;
          delete event.request.headers.cookie;
        }
      }
      
      return event;
    },
    
    // Ignore common errors
    ignoreErrors: [
      "ECONNRESET",
      "ECONNREFUSED",
      "ETIMEDOUT",
    ],
  });

  console.log(`✅ Sentry initialized for ${environment} environment`);
}

/**
 * Setup Sentry error handler for Express
 * Call this AFTER all controllers and BEFORE any other error middleware
 */
export function setupSentryErrorHandler(app: Express) {
  Sentry.setupExpressErrorHandler(app);
}

/**
 * Capture a custom error to Sentry
 */
export function captureError(error: Error, context?: Record<string, any>) {
  Sentry.captureException(error, {
    extra: context,
  });
}

/**
 * Set user context for Sentry events
 */
export function setSentryUser(userId: number | null, email?: string, role?: string) {
  if (userId) {
    Sentry.setUser({
      id: userId.toString(),
      email,
      role,
    });
  } else {
    Sentry.setUser(null);
  }
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(message: string, data?: Record<string, any>) {
  Sentry.addBreadcrumb({
    message,
    data,
    level: "info",
  });
}
