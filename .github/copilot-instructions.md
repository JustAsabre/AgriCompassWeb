# AgriCompassWeb AI Coding Guidelines

This project is a full-stack agricultural marketplace built with React + Express + Drizzle ORM. Follow these project-specific patterns for immediate productivity.

## Architecture Overview
- **Client-Server Model**: React frontend (client/) communicates via HTTP with Express backend (server/). Use TanStack Query for client-side data fetching and caching.
- **Storage Abstraction**: All data operations go through `storage.ts` interface - switch between in-memory (dev) and PostgreSQL (prod) without changing business logic.
- **Session-Based Auth**: Use `req.session.user` in routes.ts for authentication; roles enforced via `requireAuth` and `requireRole` middleware (see server/routes.ts lines 30-45).
- **Database Schema**: Tables in shared/schema.ts (users, listings, orders, cart_items, verifications); foreign keys like `listings.farmer_id REFERENCES users(id)`.

## Critical Workflows
- **Development**: Run `npm run dev` (starts Vite HMR on port 5000); server uses `tsx server/index.ts`.
- **Building**: `npm run build` (Vite client + esbuild server bundle); `npm start` for production.
- **Testing**: `npm run test` (Vitest unit tests); `npm run test:e2e` (Playwright); set `ENABLE_TEST_ENDPOINTS=true` for test-only routes.
- **Database**: `npm run db:push` (Drizzle migrations); use Neon for prod, in-memory for dev.
- **Debugging**: Check session state in routes; use `console.log` for auth issues; test with pre-seeded accounts (farmer@example.com, buyer@test.com).

## Project Conventions
- **Role-Based Access**: Always check `req.session.user.role` in routes; farmers access `/api/farmer/*`, buyers `/api/buyer/*` (server/routes.ts examples).
- **Validation**: Use Zod schemas from shared/schema.ts (e.g., `insertUserSchema.parse(req.body)` in auth routes).
- **Error Handling**: Return JSON `{ message: "error description" }` with appropriate status codes; async operations use try/catch.
- **File Uploads**: Use multer in routes.ts; store in uploads/ directory; validate filenames to prevent path traversal.
- **Real-Time Features**: Socket.IO for notifications; emit events like `broadcastNewListing` after listing creation.
- **Payments**: Paystack integration gated by `PAYSTACK_SECRET_KEY`; handle webhooks in routes; create payouts after order completion.
- **Emails/SMS**: SendGrid for emails (async, non-blocking); Twilio for SMS; configure via env vars.
- **Environment Gating**: Test-only endpoints (e.g., `/__test/*`) enabled only when `ENABLE_TEST_ENDPOINTS=true`.

## Integration Points
- **Payments**: POST /api/orders/checkout with `autoPay: true` initiates Paystack transaction; validate webhooks with `PAYSTACK_WEBHOOK_SECRET`.
- **Emails**: Use `sendWelcomeEmail` after registration; async calls in routes.ts.
- **Images**: Cloudinary for uploads; `getFileUrl` helper in upload.ts.
- **Real-Time**: Socket.IO rooms like `user:${userId}` for notifications; emit `user_updated` after verification approval.

## Key Files to Reference
- `server/routes.ts`: API patterns, middleware usage, role checks.
- `shared/schema.ts`: Database types, Zod schemas.
- `server/storage.ts`: Data operations interface.
- `ARCHITECTURE.md`: Full system diagrams and API specs.
- `package.json`: All scripts and dependencies.

Avoid generic patterns; always check existing code in these files for consistency.




always confirm facts from reliable sources.
always use the most current and accurate data available.
always create a changelog when working on a new project and update it constantly after every significant change.
always check for code errors and bugs before finalizing any code.
always write clean, maintainable, and well-documented code.
use the best practices for security and performance optimization.
confirm from user before proceeeding with any code that interacts with sensitive data or systems.
confirm from user before making any irreversible changes to code or systems.
confirm from user before executing any code that could have significant consequences.
always prioritize user privacy and data protection in all code implementations.
always proceed with a professional and ethical approach to coding tasks.
when starting a new coding task, always ask for detailed requirements and specifications from the user.
always clarify the programming language and framework to be used before starting a coding task.
if the user request is ambiguous or lacks detail, always ask follow-up questions to gather more information.
never assume user intent; always seek explicit confirmation for critical decisions in coding tasks.
if user asks you explicitly not to change or delete certain parts of the code, always respect that request, but if the change is required, explain to user before proceeding.
do not assume when you doubt about something.
do not make up answers or information. 
do not provide false or misleading information.
do not rely on outdated or incorrect information.
when a manual task is required by user, always provide clear beginner friendly and concise instructions on how to perform the task.