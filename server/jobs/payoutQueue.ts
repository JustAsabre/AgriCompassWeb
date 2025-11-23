// payouts queue: choose Redis/Bull backend when REDIS_* environment variables are configured.
import { log } from '../vite';
import path from 'path';
import fs from 'fs';
import { storage } from '../storage';

let usingBull = false;
let bullQueue: any = null;
let memory: any = null;

// helper that will be used by both backends to perform the job logic
async function processPayoutJobFromData(payoutId: string) {
  const payout = await storage.getPayout(payoutId);
  if (!payout) {
    log(`Payout job: payout ${payoutId} not found`);
    return;
  }
  if (payout.status === 'completed' || payout.status === 'processing') return;
  const paystackKey = process.env.PAYSTACK_SECRET_KEY;
  const autoPay = process.env.PAYSTACK_AUTO_PAYOUTS === 'true';
  if (!paystackKey || !autoPay) {
    await storage.updatePayout(payoutId, { status: 'completed', completedAt: new Date() } as any);
    log(`Payout job: marked payout ${payoutId} completed (no paystack)`);
    return;
  }
  try {
    await storage.updatePayout(payoutId, { status: 'processing' } as any);
    const farmer = await storage.getUser(payout.farmerId);
    if (!farmer) throw new Error('Farmer not found for payout');
    const recipient = (farmer as any).paystackRecipientCode;
    if (!recipient) throw new Error('No paystack recipient for farmer');
    const amount = Math.round(Number(payout.amount) * 100);
    const res = await fetch('https://api.paystack.co/transfer', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${paystackKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: 'balance', amount, recipient, reason: `Payout ${payoutId}` }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error('Paystack transfer failed', res.status, text);
      await storage.updatePayout(payoutId, { status: 'failed' } as any);
      return;
    }
    const body = await res.json();
    const success = body.status === 'success' || body.data?.status === 'success';
    if (success) {
      await storage.updatePayout(payoutId, { status: 'completed', completedAt: new Date() } as any);
      log(`Payout job: transfer successful for ${payoutId}`);
    } else {
      await storage.updatePayout(payoutId, { status: 'processing' } as any);
      log(`Payout job: transfer created for ${payoutId}, status=${body.data?.status}`);
    }
  } catch (err) {
    console.error('Payout job exception', err);
    await storage.updatePayout(payoutId, { status: 'failed' } as any);
  }
}

// MEMORY fallback (keeps previous behavior when Redis isn't configured)
async function initMemoryBackend() {
  const modulePath = path.join(process.cwd(), 'server', 'jobs', 'payoutQueueMemory.js');
  if (fs.existsSync(modulePath) || fs.existsSync(modulePath.replace('.js', '.ts'))) {
    memory = await import('./payoutQueueMemory');
    return true;
  }
  return false;
}

// BULL backend (uses Redis). Load dynamically so CI/test environments without Redis or bull installed won't break.
async function initBullBackend() {
  try {
    const { default: Bull } = await import('bull');
    const redisUrl = process.env.REDIS_URL;
    const redisHost = process.env.REDIS_HOST;
    const redisPort = Number(process.env.REDIS_PORT || '6379');
    const opts = redisUrl ? redisUrl : { host: redisHost || '127.0.0.1', port: redisPort };
    bullQueue = new Bull('payouts', opts as any);
    // set up worker
    bullQueue.process(async (job: any) => {
      const { payoutId } = job.data || {};
      await processPayoutJobFromData(payoutId);
    });
    bullQueue.on('failed', (job: any, err: any) => {
      console.error('Bull payout job failed', job?.id, err);
    });
    usingBull = true;
    return true;
  } catch (err) {
    console.warn('Bull backend unavailable. Falling back to memory backend. Error:', err && err.message ? err.message : err);
    return false;
  }
}

// Initialize the preferred backend based on env configuration
export async function startProcessing() {
  // prefer Bull if redis configured
  if (process.env.REDIS_URL || process.env.REDIS_HOST) {
    const ok = await initBullBackend();
    if (ok) return;
  }

  // fallback to in-memory backend
  const mem = await initMemoryBackend();
  if (mem) {
    memory.startProcessingMemory();
  } else {
    console.warn('No payout queue backend available');
  }
}

export function stopProcessing() {
  if (usingBull && bullQueue) {
    bullQueue.close().catch((err: any) => console.error('Failed to close bull queue', err));
  }
  if (memory) {
    memory.stopProcessingMemory();
  }
}

export async function enqueuePayout(payoutId: string) {
  if (!usingBull && !memory) {
    // lazy init - attempt to set up backend
    if (process.env.REDIS_URL || process.env.REDIS_HOST) {
      await initBullBackend();
    } else {
      await initMemoryBackend();
    }
  }

  if (usingBull && bullQueue) {
    const job = await bullQueue.add({ payoutId }, { attempts: 3, backoff: { type: 'exponential', delay: 2000 } });
    return { queued: true, jobId: job?.id };
  }
  if (memory) {
    return memory.enqueuePayoutMemory(payoutId);
  }
  throw new Error('No payout queue backend available');
}

