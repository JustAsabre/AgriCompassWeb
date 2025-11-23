import { storage } from '../storage';
import { log } from '../vite';

type Job = { payoutId: string };

const queue: Job[] = [];
let running = false;
let intervalId: NodeJS.Timeout | null = null;

export function enqueuePayoutMemory(payoutId: string) {
  queue.push({ payoutId });
  if (!running) startProcessingMemory();
  return { queued: true, payoutId };
}

export function startProcessingMemory() {
  running = true;
  intervalId = setInterval(async () => {
    if (queue.length === 0) return;
    const job = queue.shift();
    if (!job) return;
    try {
      await processPayoutJob(job);
    } catch (err) {
      console.error('Payout job failed', err);
      // On failure, requeue job with backoff (simple)
      queue.push(job);
    }
  }, 1500);
}

async function processPayoutJob(job: Job) {
  const { payoutId } = job;
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
    if (!recipient) {
      await storage.updatePayout(payoutId, { status: 'needs_recipient' } as any);
      log(`Payout job: payout ${payoutId} requires a recipient`);
      return;
    }
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
    await storage.updatePayout(payoutId, { status: 'failed', adminNote: (err && (err as any).message) || String(err) } as any);
  }
}

export function stopProcessingMemory() {
  if (intervalId) clearInterval(intervalId);
  running = false;
}
