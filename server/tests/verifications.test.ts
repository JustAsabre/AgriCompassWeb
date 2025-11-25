import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express, { type Express } from 'express';
import session from 'express-session';
import { createServer } from 'http';
import { registerRoutes } from '../routes';
import { initializeSocket } from '../socket';
import { storage } from '../storage';
import './setup';

// Mock email functions to avoid external dependencies
vi.mock('../email', () => ({
  sendPasswordResetEmail: vi.fn().mockResolvedValue({ success: true }),
  sendPasswordChangedEmail: vi.fn().mockResolvedValue({ success: true }),
  sendWelcomeEmail: vi.fn().mockResolvedValue({ success: true }),
  sendOrderConfirmationEmail: vi.fn().mockResolvedValue({ success: true }),
  sendNewOrderNotificationToFarmer: vi.fn().mockResolvedValue({ success: true }),
  sendVerificationStatusEmail: vi.fn().mockResolvedValue({ success: true }),
  getSmtpStatus: vi.fn().mockReturnValue({ status: 'ok' }),
}));

describe('Verifications API', () => {
  beforeAll(() => {
    process.env.ENABLE_TEST_ENDPOINTS = 'true';
  });

  let app: Express;
  let httpServer: any;
  let farmerAgent: any;
  let officerAgent: any;
  let farmerId: string;
  let officerId: string;

  beforeEach(async () => {
    storage.cleanup();

    app = express();
    app.use(express.json());
    app.use(
      session({
        secret: 'test-secret',
        resave: false,
        saveUninitialized: false,
        cookie: { secure: false },
      })
    );
    httpServer = createServer(app);
    const io = initializeSocket(httpServer);
    await registerRoutes(app, httpServer, io);

    // Create farmer user
    const farmerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'farmer@test.com',
        password: 'password123',
        fullName: 'Test Farmer',
        role: 'farmer',
      });
    farmerId = farmerResponse.body.user.id;

    // Create field officer user
    const officerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'officer@test.com',
        password: 'password123',
        fullName: 'Test Officer',
        role: 'field_officer',
      });
    officerId = officerResponse.body.user.id;

    // Login with agents to maintain sessions
    farmerAgent = request.agent(app);
    await farmerAgent
      .post('/api/auth/login')
      .send({ email: 'farmer@test.com', password: 'password123' });

    officerAgent = request.agent(app);
    await officerAgent
      .post('/api/auth/login')
      .send({ email: 'officer@test.com', password: 'password123' });
  });

  afterEach(() => {
    storage.cleanup();

    if (httpServer && httpServer.listening) {
      httpServer.close();
    }
  });

  describe('GET /api/verifications', () => {
    it('returns verifications for field officer', async () => {
      const response = await officerAgent.get('/api/verifications');
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('rejects access from farmer', async () => {
      const response = await farmerAgent.get('/api/verifications');
      expect(response.status).toBe(403);
    });

    it('rejects access from unauthenticated user', async () => {
      const response = await request(app).get('/api/verifications');
      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/verifications/me', () => {
    it('returns null when farmer has no verification', async () => {
      const response = await farmerAgent.get('/api/verifications/me');
      expect(response.status).toBe(200);
      expect(response.body).toBe("");
    });

    it('returns verification status for farmer', async () => {
      // First create a verification request
      await farmerAgent
        .post('/api/verifications/request')
        .send({
          farmSize: "5 acres",
          farmLocation: "Accra",
          experienceYears: 10,
          additionalInfo: "Growing tomatoes and peppers",
          documentUrl: "https://example.com/doc.pdf"
        });

      const response = await farmerAgent
        .get('/api/verifications/me')
        .expect(200);

      expect(response.body).toHaveProperty("id");
      expect(response.body.farmerId).toBe(farmerId);
      expect(response.body.status).toBe("pending");
      expect(response.body.notes).toContain("Farm Location: Accra");
      expect(response.body.notes).toContain("Experience: 10 years");
    });

    it('rejects access from field officer', async () => {
      const response = await officerAgent.get('/api/verifications/me');
      expect(response.status).toBe(403);
    });

    it('rejects access from unauthenticated user', async () => {
      const response = await request(app).get('/api/verifications/me');
      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/verifications/request', () => {
    it('creates verification request for farmer', async () => {
      const response = await farmerAgent
        .post('/api/verifications/request')
        .send({
          farmSize: "5 acres",
          farmLocation: "Accra",
          experienceYears: 10,
          additionalInfo: "Growing tomatoes and peppers",
          documentUrl: "https://example.com/doc.pdf"
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('farmerId', farmerId);
      expect(response.body).toHaveProperty('status', 'pending');
      expect(response.body.notes).toContain("Farm Location: Accra");
      expect(response.body.notes).toContain("Experience: 10 years");
    });

    it('rejects duplicate verification request', async () => {
      // Create first request
      await farmerAgent
        .post('/api/verifications/request')
        .send({
          farmSize: "5 acres",
          farmLocation: "Accra",
          experienceYears: 10,
          additionalInfo: "Growing tomatoes and peppers"
        });

      // Try to create second request
      const response = await farmerAgent
        .post('/api/verifications/request')
        .send({
          farmSize: "5 acres",
          farmLocation: "Accra",
          experienceYears: 10,
          additionalInfo: "Growing tomatoes and peppers"
        })
        .expect(400);

      expect(response.body.message).toBe("You already have a verification request");
    });

    it('rejects request from field officer', async () => {
      const response = await officerAgent
        .post('/api/verifications/request')
        .send({
          farmSize: "5 acres",
          farmLocation: "Accra",
          experienceYears: 10
        });

      expect(response.status).toBe(403);
    });

    it('rejects request from unauthenticated user', async () => {
      const response = await request(app)
        .post('/api/verifications/request')
        .send({
          farmSize: "5 acres",
          farmLocation: "Accra",
          experienceYears: 10
        });

      expect(response.status).toBe(401);
    });
  });

  describe('PATCH /api/verifications/:id/review', () => {
    let verificationId: string;

    beforeEach(async () => {
      // Create a verification request first
      const requestResponse = await farmerAgent
        .post('/api/verifications/request')
        .send({
          farmSize: "5 acres",
          farmLocation: "Accra",
          experienceYears: 10,
          additionalInfo: "Growing tomatoes and peppers"
        });
      verificationId = requestResponse.body.id;
    });

    it('allows field officer to approve verification', async () => {
      const response = await officerAgent
        .patch(`/api/verifications/${verificationId}/review`)
        .send({
          status: 'approved',
          notes: 'Farm looks good',
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('approved');
      expect(response.body.notes).toContain('Farm looks good');
    });

    it('allows field officer to reject verification', async () => {
      const response = await officerAgent
        .patch(`/api/verifications/${verificationId}/review`)
        .send({
          status: 'rejected',
          notes: 'Missing required documents',
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('rejected');
      expect(response.body.notes).toContain('Missing required documents');
    });

    it('rejects review from farmer', async () => {
      const response = await farmerAgent
        .patch(`/api/verifications/${verificationId}/review`)
        .send({
          status: 'approved',
          notes: 'Self approval',
        });

      expect(response.status).toBe(403);
    });

    it('rejects review from unauthenticated user', async () => {
      const response = await request(app)
        .patch(`/api/verifications/${verificationId}/review`)
        .send({
          status: 'approved',
          notes: 'Unauth approval',
        });

      expect(response.status).toBe(401);
    });

    it('returns 404 for non-existent verification', async () => {
      const response = await officerAgent
        .patch('/api/verifications/non-existent-id/review')
        .send({
          status: 'approved',
          notes: 'Test notes',
        });

      expect(response.status).toBe(404);
    });
  });
});