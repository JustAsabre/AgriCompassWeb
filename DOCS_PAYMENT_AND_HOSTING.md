# Payment & Hosting Guidance (Week 1–2)

This document covers implementation details added during Week 1–2 (Payment & Legal), security considerations, and recommended free-tier hosting options given the current $0 budget.

## What was implemented
- Paystack payment handling (checkout flow already in `POST /api/orders/checkout`).
- `POST /api/payments/paystack/webhook` implemented to receive provider webhook events and verify them via HMAC (if a webhook secret is configured).
- Client & admin verification endpoints: `/api/payments/paystack/verify-client` and `/api/payments/paystack/verify` are present for manual verification via Paystack's API.
- Transactions and Payments: Combined payments can create multiple payments references and link them via a common `transactionId` (currently code uses Paystack reference string for `transactionId` in the in-memory store to preserve test behavior).
- Session store enhancements: optional Redis session support (`REDIS_URL`) added; falls back to Postgres or MemoryStore if not configured.

## Security & Risk Mitigations ✅
Take note: payments & webhooks are a security-critical surface — here are the risks and mitigations implemented and recommended.

### Webhook signature verification
- Risk: Forged webhook requests that fake payment status
- Mitigation: Verify HMAC using `PAYSTACK_WEBHOOK_SECRET` against the `x-paystack-signature` header. If the secret isn't configured, the server will still accept webhooks but logging and alerts should be enabled to avoid misuse.
- Recommendation: Always set `PAYSTACK_WEBHOOK_SECRET` in production.

### Idempotency (webhooks & verification) 
- Risk: Duplicate webhook events or retries could double-mark payments or trigger duplicates
- Mitigation: The webhook handler checks the current payment status and only performs work if the payment is not already `completed`.
- Recommendation: Use transaction-level idempotency keys for DB-backed `transactions` and rely on provider-provided `reference` plus internal transaction ids.

### Credential & secret management
- Risk: Secret handling leakage or accidental logging
- Mitigation: Do not log secrets or entire raw webhook bodies. Sensitive values (API keys, webhook secrets) should stay in environment variables and not be committed.
- Recommendation: Use platform secret stores (Vercel/Render/Netlify) and rotate keys periodically.

### Rate limiting & IP restrictions
- Risk: Payment endpoints and webhook endpoints may be attacked by request storms
- Mitigation: Global rate limiting is applied to `/api/` using `express-rate-limit`.
- Recommendation: If your provider exposes IP ranges for webhooks, add IP-restrictions for `x-forwarded-for` or WAF rules for webhook endpoints.

### Order & payments reconciliation
- Risk: Out-of-band differences — payment completed but DB not updated
- Mitigation: The app provides a client and admin verification flow calling Paystack `transaction/verify/<reference>` to verify outcome and finalize local DB records. Webhook takes precedence but verify client call can be used for nudge/resync during UI redirects.
- Recommendation: Add a scheduled reconciliation job to verify pending `transactions` and reconcile mismatches.

### Sensitive Data in DB
- Risk: Storing payment or customer PII in the DB
- Mitigation: We store minimal metadata: `paystack_reference`, `amount`, `payerId`. No raw PANs or card data. We rely on provider to handle card data.
- Recommendation: Do not keep raw card numbers or non-required PII in the database.

### Logging
- Risk: Over-logging exposing payloads or keys
- Mitigation: Do not log raw webhook body or secrets. Logs only show limited metadata and `requestId`.

## Redis & Sessions
- A `Redi` session store is optional: set `REDIS_URL` to use Redis for sessions (and fallback for caching). This reduces server memory usage and allows sessions to persist across runs or multiple instances. For the free-tier:
  - Upstash offers a free Redis server with REST and Redis endpoints.
  - Railway previously had a small free tier but check current providers: Render / Upstash is recommended for $0 budget when available.

## Combined payments & transactions
- The system supports combined payments across multiple orders: the Paystack `reference` string is currently used by payments as `transactionId` in the in-memory store, and `transaction` rows exist in the schema for DB-backed usage.
- Recommendation: Move to a dedicated `transactions` record that stores `paystackReference`, and link `payments.transactionId` to `transactions.id` for robust DB handling.

## Free-tier hosting & DB options (budget $0) 💸
For a simple, free deployment stack (full site + backend + DB + Redis):

- Frontend (Vite/React):
  - Vercel (free tier): Supports static & serverless functions; automatic GitHub integration. Good for client hosting.
  - Netlify (free tier): Good also for static hosting and simple serverless functions.

- Backend (Express API & Node):
  - Render: Offers free (or low cost) starter services; supports Node servers with background workers. (Check current offering — sometimes limited to a free trial.)
  - Railway: Often offers a small free tier for hobby projects. 
  - Fly.io: Small-scale free plan and lightweight for Node apps.
  - Deta.sh: Free micro-server for small projects (if compatibility meets needs).
  - For demos and local development: use `ngrok` or `localtunnel` to expose service to Paystack for webhook development.

- Postgres DB: (Use these to store persistent storage & support production features)
  - Neon (free tier) or Supabase (free tier) are recommended for Postgres in a hosted way.
  - Alternative: Railway & Render provide Postgres starter tiers too.

- Redis: (Optional session/caching)
  - Upstash offers Redis with a free tier and easy integration.
  - Redis Labs has a small free tier.

## Productionization checklist (minimal, but critical)
1. Configure environment variables for `PAYSTACK_SECRET_KEY` and `PAYSTACK_WEBHOOK_SECRET`.
2. Configure `REDIS_URL` if using Redis, or `PG_CONNECTION_STRING` for a Postgres session store.
3. Use HTTPS (always enable HTTS & HSTS in production). 
4. Configure `TRUST_PROXY` if app behind a proxy or load balancer.
5. Configure CORS to whitelist your frontend endpoints.
6. Add webhook IP restriction (if provider gives a list) or strong HMAC verification.
7. Add scheduled reconciliation job for `transactions` and `payments`.
8. Monitor logs and implement alerts for webhook failures or a mismatch between DB and provider status.

## Developer & local testing notes
1. For local webhook testing, use ngrok or use the `scripts/simulate-paystack-webhook.mjs` to produce a similar signed payload for the test environment. Example script included.
2. The test suite includes tests that mock `fetch` to Paystack and rely on the `/api/payments/paystack/webhook` and `verify-client` endpoints.

3. To use Redis for sessions on your dev machine, install these packages if you plan to enable `REDIS_URL` locally:
```bash
npm install redis connect-redis
```
Then set `REDIS_URL` to your local Redis instance (or hosted free tier like Upstash).

## Legal & Compliance Checklist (minimal)
- Add `TERMS_OF_SERVICE` and `PRIVACY_POLICY` pages and link them in the registration flows.
- Record acceptance timestamps for Terms of Service in user records and ensure consent is explicit.
- Create a Data Retention Policy and a basic incident response plan for data breaches.
- If you plan to handle payouts or sensitive user data: consult a legal advisor for the relevant region (AML/KYC, mobile money regulations, tax reporting requirements).


---
For further details and expansion, see `SPRINT5_PLAN.md` and `TESTING_GUIDE.md` for test-run guidance and environment variable setups.
