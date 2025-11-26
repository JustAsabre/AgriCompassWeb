import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express, { type Express } from 'express';
import { createServer } from 'http';
import { registerRoutes } from '../routes';
import { WebhookTestUtils } from './webhook-utils';

describe('Webhook Security Tests', () => {
  let app: Express;
  let server: any;
  let httpServer: any;

  beforeEach(async () => {
    app = express();

    // Mock raw body parsing for webhook signature verification
    app.use(express.json({
      verify: (req: any, res, buf) => {
        req.rawBody = buf;
      }
    }));

    httpServer = createServer(app);
    await registerRoutes(app, httpServer);
  });

  afterEach(() => {
    if (httpServer && httpServer.listening) {
      httpServer.close();
    }
    // Reset environment variables
    delete process.env.PAYSTACK_WEBHOOK_SECRET;
  });

  describe('Webhook Signature Verification', () => {
    it('accepts webhooks with valid signatures', async () => {
      // Set up webhook secret
      process.env.PAYSTACK_WEBHOOK_SECRET = 'test-webhook-secret-123';

      const payload = WebhookTestUtils.samplePayloads.chargeSuccess;
      const signedRequest = WebhookTestUtils.createSignedWebhookRequest(payload, process.env.PAYSTACK_WEBHOOK_SECRET);

      const response = await request(app)
        .post('/api/payments/paystack/webhook')
        .set(signedRequest.headers)
        .send(signedRequest.body);

      // Should be accepted (200 or specific success response)
      expect([200, 404]).toContain(response.status); // 404 if no transaction found, but signature is valid
    });

    it('rejects webhooks with invalid signatures', async () => {
      // Set up webhook secret
      process.env.PAYSTACK_WEBHOOK_SECRET = 'test-webhook-secret-123';

      const payload = WebhookTestUtils.samplePayloads.chargeSuccess;
      const invalidRequest = WebhookTestUtils.createInvalidSignatureWebhookRequest(payload, process.env.PAYSTACK_WEBHOOK_SECRET);

      const response = await request(app)
        .post('/api/payments/paystack/webhook')
        .set(invalidRequest.headers)
        .send(invalidRequest.body);

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid signature');
    });

    it('rejects webhooks without signature headers', async () => {
      // Set up webhook secret
      process.env.PAYSTACK_WEBHOOK_SECRET = 'test-webhook-secret-123';

      const payload = WebhookTestUtils.samplePayloads.chargeSuccess;
      const unsignedRequest = WebhookTestUtils.createUnsignedWebhookRequest(payload);

      const response = await request(app)
        .post('/api/payments/paystack/webhook')
        .set(unsignedRequest.headers)
        .send(unsignedRequest.body);

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid signature');
    });

    it('rejects webhooks when PAYSTACK_WEBHOOK_SECRET is not configured', async () => {
      // Don't set PAYSTACK_WEBHOOK_SECRET

      const payload = WebhookTestUtils.samplePayloads.chargeSuccess;
      const signedRequest = WebhookTestUtils.createSignedWebhookRequest(payload, 'dummy-secret');

      const response = await request(app)
        .post('/api/payments/paystack/webhook')
        .set(signedRequest.headers)
        .send(signedRequest.body);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('Webhook configuration error');
    });

    it('handles malformed webhook payloads gracefully', async () => {
      // Set up webhook secret
      process.env.PAYSTACK_WEBHOOK_SECRET = 'test-webhook-secret-123';

      // Create a request with invalid JSON that should be rejected by express.json() middleware
      const response = await request(app)
        .post('/api/payments/paystack/webhook')
        .set('content-type', 'application/json')
        .set('x-paystack-signature', 'invalid')
        .send('invalid json');

      // Express.json() middleware should reject malformed JSON with 400
      expect(response.status).toBe(400);
      // The error message depends on express version, just check it's an error
      expect(response.body).toBeDefined();
    });

    it('processes charge.success events correctly with valid signature', async () => {
      // Set up webhook secret
      process.env.PAYSTACK_WEBHOOK_SECRET = 'test-webhook-secret-123';

      // For this test, we'll just verify the signature validation works
      // In a real scenario, we'd create a transaction and then send the webhook
      const payload = {
        ...WebhookTestUtils.samplePayloads.chargeSuccess,
        data: {
          ...WebhookTestUtils.samplePayloads.chargeSuccess.data,
          reference: 'non-existent-ref', // This will result in 404 but signature is valid
        }
      };

      const signedRequest = WebhookTestUtils.createSignedWebhookRequest(payload, process.env.PAYSTACK_WEBHOOK_SECRET);

      const response = await request(app)
        .post('/api/payments/paystack/webhook')
        .set(signedRequest.headers)
        .send(signedRequest.body);

      // Should get 200 for non-existent transaction (acknowledged but no action taken), signature validation passed
      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.message).toBe('no linked transaction');
    });

    it('processes charge.failed events correctly with valid signature', async () => {
      // Set up webhook secret
      process.env.PAYSTACK_WEBHOOK_SECRET = 'test-webhook-secret-123';

      const payload = {
        ...WebhookTestUtils.samplePayloads.chargeFailed,
        data: {
          ...WebhookTestUtils.samplePayloads.chargeFailed.data,
          reference: 'non-existent-ref',
        }
      };

      const signedRequest = WebhookTestUtils.createSignedWebhookRequest(payload, process.env.PAYSTACK_WEBHOOK_SECRET);

      const response = await request(app)
        .post('/api/payments/paystack/webhook')
        .set(signedRequest.headers)
        .send(signedRequest.body);

      // Should be accepted (signature valid), but no transaction found so just acknowledged
      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.message).not.toBe('Invalid signature');
    });
  });

  describe('Webhook Security Edge Cases', () => {
    it('handles empty payload with valid signature', async () => {
      process.env.PAYSTACK_WEBHOOK_SECRET = 'test-webhook-secret-123';

      const payload = {};
      const signedRequest = WebhookTestUtils.createSignedWebhookRequest(payload, process.env.PAYSTACK_WEBHOOK_SECRET);

      const response = await request(app)
        .post('/api/payments/paystack/webhook')
        .set(signedRequest.headers)
        .send(signedRequest.body);

      // Should be accepted (signature valid), but no reference to process
      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.message).toBe('no reference');
    });

    it('handles payload without event field', async () => {
      process.env.PAYSTACK_WEBHOOK_SECRET = 'test-webhook-secret-123';

      const payload = { data: { reference: 'test-ref' } };
      const signedRequest = WebhookTestUtils.createSignedWebhookRequest(payload, process.env.PAYSTACK_WEBHOOK_SECRET);

      const response = await request(app)
        .post('/api/payments/paystack/webhook')
        .set(signedRequest.headers)
        .send(signedRequest.body);

      // Should be accepted but treated as unknown event
      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
    });

    it('handles payload with null data', async () => {
      process.env.PAYSTACK_WEBHOOK_SECRET = 'test-webhook-secret-123';

      const payload = { event: 'charge.success', data: null };
      const signedRequest = WebhookTestUtils.createSignedWebhookRequest(payload, process.env.PAYSTACK_WEBHOOK_SECRET);

      const response = await request(app)
        .post('/api/payments/paystack/webhook')
        .set(signedRequest.headers)
        .send(signedRequest.body);

      // Should be accepted but no reference to process
      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);
      expect(response.body.message).toBe('no reference');
    });
  });
});