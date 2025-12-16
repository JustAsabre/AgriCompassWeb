# Sentry Integration - Quick Start Checklist

## ✅ Completed (Ready to Use)
- [x] Created `client/src/sentry.ts` - Frontend initialization
- [x] Created `server/sentry.ts` - Backend initialization  
- [x] Created `SENTRY_SETUP.md` - Comprehensive setup guide
- [x] Created `install-sentry.ps1` - Installation script
- [x] Updated `.env.example` - Added Sentry variables
- [x] Created `.sentry` reference files for integration

## 🔄 When Network is Stable - Run This

```powershell
# Option 1: Use the PowerShell script
.\install-sentry.ps1

# Option 2: Direct command
npm install @sentry/react @sentry/vite-plugin @sentry/node @sentry/profiling-node --save
```

## 📝 After Package Installation

### 1. Get Sentry Account & DSNs
1. Go to https://sentry.io
2. Create free account
3. Create 2 projects:
   - React (for frontend)
   - Node.js/Express (for backend)
4. Copy both DSNs

### 2. Update `.env` File
```env
# Backend
SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
SENTRY_ENVIRONMENT=development

# Frontend  
VITE_SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
VITE_SENTRY_ENVIRONMENT=development
```

### 3. Integrate into Code

**Frontend** (`client/src/main.tsx`):
```typescript
import { initSentry } from "./sentry";

// Add this before createRoot
initSentry();

createRoot(document.getElementById("root")!).render(<App />);
```

**Backend** (`server/index.ts`):
```typescript
import { initSentry, sentryRequestHandler, sentryTracingHandler, sentryErrorHandler } from "./sentry";

// After creating express app
const app = express();
initSentry(app);

// First middleware
app.use(sentryRequestHandler());
app.use(sentryTracingHandler());

// ... all your other middleware ...

// Before your error handlers
app.use(sentryErrorHandler());
```

**Auth Integration** (`client/src/lib/auth.tsx`):
```typescript
import { setSentryUser } from "@/sentry";

// In login function after successful auth
setSentryUser(user);

// In logout function
setSentryUser(null);
```

### 4. Test It

**Frontend Test** - Add to any page temporarily:
```typescript
<button onClick={() => { throw new Error('Test Sentry Frontend'); }}>
  Test Sentry
</button>
```

**Backend Test** - Add to routes.ts temporarily:
```typescript
app.get('/api/test-sentry', () => {
  throw new Error('Test Sentry Backend');
});
```

Visit the route/click the button, then check your Sentry dashboard!

### 5. Optional: Vite Plugin for Source Maps

Update `vite.config.ts`:
```typescript
import { sentryVitePlugin } from "@sentry/vite-plugin";

export default defineConfig({
  plugins: [
    // ... your existing plugins ...
    sentryVitePlugin({
      org: "your-org-slug",
      project: "your-frontend-project",
      authToken: process.env.SENTRY_AUTH_TOKEN,
    }),
  ],
});
```

## 🎯 What You Get

### Error Tracking
- Automatic error capture
- Stack traces
- User context (ID, email, role)
- Environment info
- Release tracking

### Performance Monitoring
- Page load times
- API call durations
- Database query performance
- Custom transaction tracking

### Session Replay
- Watch user sessions when errors occur
- 10% of all sessions recorded
- 100% of error sessions recorded

### Alerts
- Email/Slack when errors occur
- Threshold alerts for error rates
- Performance degradation alerts

## 💰 Free Tier Limits

- 5,000 errors/month
- 10,000 performance traces/month  
- 50 session replays/month

**Staying Within Limits:**
- Sample rates: 10% for traces, 10% for replays
- Disabled in development by default
- Only critical errors sent

## 📚 Reference Files

- `SENTRY_SETUP.md` - Detailed documentation
- `client/src/sentry.ts` - Frontend implementation
- `server/sentry.ts` - Backend implementation
- `client/src/main.tsx.sentry` - Frontend integration example
- `server/index.ts.sentry` - Backend integration example

## ⚠️ Important Notes

1. **DSN is public** - Frontend DSN will be in your JS bundle (this is normal)
2. **Restart dev server** after adding env variables
3. **Use VITE_ prefix** for all frontend env variables
4. **Events disabled in dev** by default (set `*_SENTRY_DEBUG=true` to enable)

## 🐛 Troubleshooting

**"Cannot find module '@sentry/react'"**
→ Run the installation command above

**"Sentry DSN not provided"**
→ Check `.env` file has correct DSN variables

**Events not showing in Sentry**
→ Enable debug: `VITE_SENTRY_DEBUG=true` (frontend) or `SENTRY_DEBUG=true` (backend)

**Network error during install**
→ Check your internet connection, try again

## 🚀 Next Steps

After installation works:
1. [ ] Get Sentry DSNs
2. [ ] Update .env file
3. [ ] Integrate into main.tsx
4. [ ] Integrate into server/index.ts
5. [ ] Add user context in auth.tsx
6. [ ] Test with sample errors
7. [ ] Deploy and monitor
8. [ ] Set up alerts in Sentry dashboard

---

**Ready to proceed when network is stable!** 🎉
