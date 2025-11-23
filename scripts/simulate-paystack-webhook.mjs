#!/usr/bin/env node
import crypto from 'crypto';
// node v18+ provides fetch globally
import fs from 'fs';

// Usage: node simulate-paystack-webhook.mjs --url http://localhost:5000/api/payments/paystack/webhook --reference ref-123 --event charge.success
const argv = process.argv.slice(2);
const args = {};
for (let i = 0; i < argv.length; i += 2) {
  args[argv[i].replace(/^--/, '')] = argv[i + 1];
}

const url = args.url || 'http://localhost:5000/api/payments/paystack/webhook';
const reference = args.reference || 'ref-test-123';
const event = args.event || 'charge.success';
const sharedSecret = process.env.PAYSTACK_WEBHOOK_SECRET || '';

const payload = JSON.stringify({ event, data: { reference } });

// Compute signature if secret provided
let signature;
if (sharedSecret) {
  signature = crypto.createHmac('sha512', sharedSecret).update(payload).digest('hex');
}

async function run() {
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (signature) headers['x-paystack-signature'] = signature;

    console.log(`Sending payload to ${url}`);
    console.log('Payload:', payload);
    if (signature) console.log('Signature:', signature);

    const res = await fetch(url, { method: 'POST', body: payload, headers });
    const text = await res.text();
    console.log('Status', res.status);
    console.log('Response:', text);
  } catch (err) {
    console.error('Failed to send webhook', err);
  }
}

run();
