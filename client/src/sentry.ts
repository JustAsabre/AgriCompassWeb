import * as Sentry from "@sentry/react";

/**
 * Initialize Sentry for React frontend
 * Error tracking and performance monitoring
 */
export function initSentry() {
  const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
  const environment = import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE;
  
  // Only initialize if DSN is provided and not empty
  if (!sentryDsn || sentryDsn.trim() === '') {
    // Silent in production to avoid console clutter
    if (environment === 'development') {
      console.log("Sentry DSN not provided - error tracking disabled");
    }
    return;
  }

  Sentry.init({
    dsn: sentryDsn,
    environment,
    
    // Performance Monitoring
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    
    // Performance traces sample rate (0.0 - 1.0)
    // 1.0 = 100% of transactions are sent
    tracesSampleRate: environment === "production" ? 0.1 : 1.0,
    
    // Session Replay sample rate (0.0 - 1.0)
    // This sets the sample rate at 10%. You may want to change it to 100% while in development
    replaysSessionSampleRate: environment === "production" ? 0.1 : 1.0,
    
    // Capture 100% of sessions with errors
    replaysOnErrorSampleRate: 1.0,
    
    // Filter out sensitive data
    beforeSend(event) {
      // Don't send events in development unless explicitly enabled
      if (environment === "development" && !import.meta.env.VITE_SENTRY_DEBUG) {
        return null;
      }
      
      // Remove sensitive data from events
      if (event.request) {
        delete event.request.cookies;
        delete event.request.headers;
      }
      
      return event;
    },
    
    // Ignore common errors that don't need tracking
    ignoreErrors: [
      // Browser extensions
      "top.GLOBALS",
      "chrome-extension://",
      "moz-extension://",
      // Network errors
      "NetworkError",
      "Network request failed",
      // AbortController cancellations
      "AbortError",
    ],
  });
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
export function setSentryUser(user: { id: number; email: string; role: string } | null) {
  if (user) {
    Sentry.setUser({
      id: user.id.toString(),
      email: user.email,
      role: user.role,
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
