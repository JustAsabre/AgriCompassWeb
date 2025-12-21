import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express, { type Express } from 'express';
import { createServer } from 'http';
import { registerRoutes } from '../routes';
import { storage } from '../storage';
import sessionMiddleware from '../session';
import './setup';

// CSRF protection - ensure it sits after session middleware
// We use a dynamic import here to avoid static import resolution failing when `csurf` is not installed.
// Note: install `csurf` for production deployments where CSRF protection is required.
async function maybeEnableCsrf(app: Express) {
  let csrfEnabled = false;
  try {
    const csurfModule = await import('csurf');
    const csurfFn = (csurfModule as any).default || csurfModule;
    const csrfProtection = csurfFn({ cookie: false }); // store in session by default
    app.use(csrfProtection);
    csrfEnabled = true;
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

describe('CSRF and verification session behavior', () => {
  let app: Express;
  let httpServer: any;

  beforeEach(async () => {
    await storage.cleanup();
    app = express();
    app.use(express.json());
    app.use(sessionMiddleware);
    httpServer = createServer(app);
    await maybeEnableCsrf(app);
    await registerRoutes(app, httpServer);
  });

  const verifyEmail = async (email: string) => {
    const user = await storage.getUserByEmail(email.toLowerCase());
    if (!user) throw new Error(`Test setup: user not found for email ${email}`);
    if ((user as any).emailVerified) return;
    const token = (user as any).emailVerificationToken;
    if (!token) throw new Error(`Test setup: missing emailVerificationToken for ${email}`);
    await request(app)
      .get(`/api/auth/verify-email?token=${encodeURIComponent(token)}`)
      .expect(200);
  };

  const registerVerifyLogin = async (email: string, role: string, fullName: string) => {
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({ email, password: 'password123', fullName, role });
    expect(registerRes.status).toBe(201);
    await verifyEmail(email);

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'password123' });
    expect(loginRes.status).toBe(200);
    const setCookie = loginRes.headers['set-cookie']?.[0];
    expect(setCookie).toBeDefined();
    return String(setCookie).split(';')[0];
  };

  it('should return JSON for /api/csrf-token', async () => {
    const response = await request(app).get('/api/csrf-token');
    expect(response.status).toBe(200);
    // Body should be JSON with csrfToken present (may be null) and not HTML
    expect(response.type).toBe('application/json');
    expect(response.body).toHaveProperty('csrfToken');
  });

  it('should update farmer session after verification is approved', async () => {
    // Officer must exist before farmer can submit a verification request (request assigns to first officer)
    const officerCookie = await registerVerifyLogin('testofficer@example.com', 'field_officer', 'Officer');

    // Farmer: register → verify email → login
    const farmerCookie = await registerVerifyLogin('testfarmer@example.com', 'farmer', 'Farmer');

    // Farmer is logged-in (by cookie), get their auth/me
    const farmerMe = await request(app).get('/api/auth/me').set('Cookie', farmerCookie);
    expect(farmerMe.status).toBe(200);
    expect(farmerMe.body.user.verified).toBe(false);

    // Submit verification request as farmer
    const verificationRequest = await request(app)
      .post('/api/verifications/request')
      .set('Cookie', farmerCookie)
      .send({ farmerId: farmerMe.body.user.id, farmSize: '1', documentUrl: '' });
    expect(verificationRequest.status).toBe(200);
    const verif = verificationRequest.body;

    // Officer reviews verification and approves
    const review = await request(app)
      .patch(`/api/verifications/${verif.id}/review`)
      .set('Cookie', officerCookie)
      .send({ status: 'approved', notes: 'All good' });
    expect(review.status).toBe(200);

    // Now farmer /api/auth/me should reflect verified true using same farmer cookie
    const farmerMeAfter = await request(app).get('/api/auth/me').set('Cookie', farmerCookie);
    expect(farmerMeAfter.status).toBe(200);
    expect(farmerMeAfter.body.user.verified).toBe(true);
  });
});
