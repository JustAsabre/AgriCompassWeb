import crypto from 'crypto';

/**
 * Webhook security utilities for testing Paystack webhook signature verification
 */
export class WebhookTestUtils {
  private static readonly ALGORITHM = 'sha512';

  /**
   * Generate a valid Paystack webhook signature for testing
   * @param payload The webhook payload (request body)
   * @param secret The webhook secret
   * @returns The HMAC signature as a hex string
   */
  static generateSignature(payload: any, secret: string): string {
    const payloadString = JSON.stringify(payload);
    const payloadBuffer = Buffer.from(payloadString);
    return crypto.createHmac(this.ALGORITHM, secret).update(payloadBuffer).digest('hex');
  }

  /**
   * Create a mock webhook request with proper signature
   * @param payload The webhook payload
   * @param secret The webhook secret
   * @returns Object containing headers and body for the mock request
   */
  static createSignedWebhookRequest(payload: any, secret: string) {
    const signature = this.generateSignature(payload, secret);
    return {
      headers: {
        'x-paystack-signature': signature,
        'content-type': 'application/json',
      },
      body: payload,
      rawBody: Buffer.from(JSON.stringify(payload)),
    };
  }

  /**
   * Create a mock webhook request with invalid signature for testing rejection
   * @param payload The webhook payload
   * @param secret The webhook secret
   * @returns Object containing headers and body with invalid signature
   */
  static createInvalidSignatureWebhookRequest(payload: any, secret: string) {
    const invalidSignature = this.generateSignature(payload, secret) + 'invalid';
    return {
      headers: {
        'x-paystack-signature': invalidSignature,
        'content-type': 'application/json',
      },
      body: payload,
      rawBody: Buffer.from(JSON.stringify(payload)),
    };
  }

  /**
   * Create a mock webhook request without signature header
   * @param payload The webhook payload
   * @returns Object containing headers and body without signature
   */
  static createUnsignedWebhookRequest(payload: any) {
    return {
      headers: {
        'content-type': 'application/json',
      },
      body: payload,
      rawBody: Buffer.from(JSON.stringify(payload)),
    };
  }

  /**
   * Sample Paystack webhook payloads for testing
   */
  static readonly samplePayloads = {
    chargeSuccess: {
      event: 'charge.success',
      data: {
        id: 123456789,
        reference: 'test-ref-123',
        amount: 50000, // Amount in kobo (500 NGN)
        currency: 'NGN',
        status: 'success',
        paid_at: new Date().toISOString(),
        customer: {
          email: 'test@example.com',
        },
      },
    },

    transactionSuccess: {
      event: 'transaction.success',
      data: {
        id: 123456789,
        reference: 'test-ref-123',
        amount: 50000,
        currency: 'NGN',
        status: 'success',
        paid_at: new Date().toISOString(),
        customer: {
          email: 'test@example.com',
        },
      },
    },

    chargeFailed: {
      event: 'charge.failed',
      data: {
        id: 123456789,
        reference: 'test-ref-123',
        amount: 50000,
        currency: 'NGN',
        status: 'failed',
        customer: {
          email: 'test@example.com',
        },
      },
    },
  };
}