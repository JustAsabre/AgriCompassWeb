# Sentry Integration Setup Guide

## Overview
Sentry has been configured for both frontend (React) and backend (Express) error tracking and performance monitoring.

## Installation Required

Run this command once your network is stable:

```bash
npm install @sentry/react @sentry/vite-plugin @sentry/node @sentry/profiling-node --save
```

## Setup Steps

### 1. Create Sentry Account & Projects

1. Go to [https://sentry.io](https://sentry.io) and create a free account
2. Create TWO projects:
   - **Frontend Project**: Select "React" as the platform
   - **Backend Project**: Select "Node.js/Express" as the platform
3. Copy the DSN (Data Source Name) from each project

### 2. Configure Environment Variables

Add these to your `.env` file:

```env
# Sentry Configuration
# Backend DSN (from your Node.js project in Sentry)
SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx

# Environment (development/staging/production)
SENTRY_ENVIRONMENT=development

# Optional: Enable Sentry in development (default: disabled)
# SENTRY_DEBUG=true
```

Add these to your `.env` file for the frontend (Vite uses VITE_ prefix):

```env
# Frontend Sentry Configuration
VITE_SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
VITE_SENTRY_ENVIRONMENT=development

# Optional: Enable Sentry in development
# VITE_SENTRY_DEBUG=true
```

### 3. Files Created

✅ **`client/src/sentry.ts`** - Frontend Sentry initialization
✅ **`server/sentry.ts`** - Backend Sentry initialization
✅ **`SENTRY_SETUP.md`** - This setup guide (you're reading it)

### 4. Integration Points (To Be Updated)

The following files need to be updated once packages are installed:

#### Frontend Integration
- `client/src/main.tsx` - Initialize Sentry before React
- `client/src/App.tsx` - Wrap app with Sentry Error Boundary
- `client/src/lib/auth.tsx` - Set user context after login
- `vite.config.ts` - Add Sentry Vite plugin for source maps

#### Backend Integration
- `server/index.ts` - Initialize Sentry and add middleware
- Error handlers - Ensure Sentry captures errors

## Features Included

### Frontend Features
- ✅ Error tracking with stack traces
- ✅ Performance monitoring (page loads, API calls)
- ✅ Session replay (10% of sessions, 100% of errors)
- ✅ User context (ID, email, role)
- ✅ Breadcrumbs for debugging
- ✅ Sensitive data filtering (cookies, headers)

### Backend Features
- ✅ Error tracking with stack traces
- ✅ Performance monitoring (HTTP requests, DB queries)
- ✅ Profiling (CPU/memory usage)
- ✅ User context per request
- ✅ Breadcrumbs for debugging
- ✅ Sensitive data filtering (auth headers, cookies)

## Sample Rates

### Production (Cost-Efficient)
- Performance traces: 10% of transactions
- Session replays: 10% of sessions
- Error replays: 100% of sessions with errors
- Profiling: 10% of transactions

### Development
- Performance traces: 100% (if SENTRY_DEBUG enabled)
- Session replays: 100% (if enabled)
- By default, events are NOT sent in development unless `VITE_SENTRY_DEBUG=true` or `SENTRY_DEBUG=true`

## Usage Examples

### Manual Error Capture (Frontend)
```typescript
import { captureError, addBreadcrumb } from '@/sentry';

try {
  // Your code
} catch (error) {
  captureError(error as Error, { context: 'additional info' });
}

// Add breadcrumb for debugging
addBreadcrumb('User clicked checkout', { cartTotal: 150 });
```

### Manual Error Capture (Backend)
```typescript
import { captureError, addBreadcrumb } from './sentry';

try {
  // Your code
} catch (error) {
  captureError(error as Error, { userId: req.session.user?.id });
}
```

### Set User Context (Frontend)
```typescript
import { setSentryUser } from '@/sentry';

// After successful login
setSentryUser({
  id: user.id,
  email: user.email,
  role: user.role,
});

// After logout
setSentryUser(null);
```

## Ignored Errors

Common non-critical errors are automatically ignored:
- Browser extension errors
- Network errors (ECONNRESET, etc.)
- AbortController cancellations
- Development-only errors

## Testing

### Test Frontend Error
```typescript
// Temporarily add to any page
<button onClick={() => { throw new Error('Test Sentry Error'); }}>
  Test Sentry
</button>
```

### Test Backend Error
```typescript
// Temporarily add to routes.ts
app.get('/api/test-sentry', (req, res) => {
  throw new Error('Test Sentry Backend Error');
});
```

## Security Notes

1. **DSN is public** - The frontend DSN will be visible in your built JavaScript. This is normal and safe.
2. **Sensitive data filtering** - Cookies, auth headers, and passwords are automatically stripped
3. **Rate limiting** - Sample rates prevent overwhelming Sentry with events
4. **Environment separation** - Use different projects for dev/staging/prod

## Cost Management

Sentry Free Tier includes:
- 5,000 errors/month
- 10,000 performance traces/month
- 50 replays/month

To stay within limits:
- Use 10% sample rates in production
- Disable in development unless debugging
- Set up error grouping rules
- Use release tracking to focus on new errors

## Troubleshooting

### "Sentry DSN not provided"
- Check environment variables are set correctly
- For frontend, ensure `VITE_` prefix is used
- Restart dev server after adding env vars

### Events not appearing in Sentry
- Check environment (dev events are disabled by default)
- Enable debug mode: `VITE_SENTRY_DEBUG=true` or `SENTRY_DEBUG=true`
- Verify DSN is correct
- Check network tab for outgoing requests to Sentry

### Too many events
- Reduce sample rates in production
- Add more items to `ignoreErrors` array
- Set up error grouping in Sentry dashboard

## Next Steps

1. ✅ Install packages (when network is stable)
2. ⏳ Get Sentry DSNs from your account
3. ⏳ Update environment variables
4. ⏳ Integrate into `main.tsx` and `index.ts`
5. ⏳ Test with sample errors
6. ⏳ Deploy and monitor

## Resources

- [Sentry React Docs](https://docs.sentry.io/platforms/javascript/guides/react/)
- [Sentry Node.js Docs](https://docs.sentry.io/platforms/node/)
- [Sentry Dashboard](https://sentry.io)
