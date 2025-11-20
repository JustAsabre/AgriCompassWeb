import { setTimeout as wait } from 'timers/promises';
import { type SentMessageInfo } from 'nodemailer';
import { log } from './vite';
import nodemailer from 'nodemailer';

type EmailJob = {
  id: string;
  to: string;
  subject: string;
  html: string;
  attempts: number;
  maxAttempts: number;
};

const queue: EmailJob[] = [];
let processing = false;

export function enqueueEmail(job: Omit<EmailJob, 'id' | 'attempts' | 'maxAttempts'> & { maxAttempts?: number }) {
  const id = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const fullJob: EmailJob = {
    id,
    to: job.to,
    subject: job.subject,
    html: job.html,
    attempts: 0,
    maxAttempts: job.maxAttempts ?? 3,
  };
  queue.push(fullJob);
  // start processing loop if not running
  if (!processing) void processQueue();
  return id;
}

async function processQueue() {
  processing = true;
  while (queue.length > 0) {
    const job = queue.shift()!;
    try {
      await attemptSend(job);
      log(`Email job ${job.id} sent to ${job.to}`);
    } catch (err: any) {
      job.attempts++;
      if (job.attempts < job.maxAttempts) {
        const backoff = Math.pow(2, job.attempts) * 1000;
        log(`Email job ${job.id} failed, retrying in ${backoff}ms: ${err && err.message ? err.message : err}`);
        // requeue after backoff
        setTimeout(() => queue.unshift(job), backoff);
      } else {
        log(`Email job ${job.id} failed permanently after ${job.attempts} attempts: ${err && err.message ? err.message : err}`);
      }
    }
    // small pause to avoid tight loop
    await wait(100);
  }
  processing = false;
}

async function attemptSend(job: EmailJob): Promise<SentMessageInfo | null> {
  // Build a transporter locally using env vars (keeps queue independent)
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
  const secureEnv = process.env.SMTP_SECURE;
  const secure = secureEnv === 'true' || secureEnv === '1' || (port === 465);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const service = process.env.SMTP_SERVICE;

  let transporter: any = null;
  if (host) {
    const opts: any = { host, port: port || 587, secure: !!secure };
    if (user && pass) opts.auth = { user, pass };
    transporter = nodemailer.createTransport(opts);
  } else if (service === 'gmail' && user && pass) {
    transporter = nodemailer.createTransport({ service: 'gmail', auth: { user, pass } });
  }

  if (!transporter) {
    log(`No transporter configured — would send email to ${job.to} subject: ${job.subject}`);
    return null;
  }

  return transporter.sendMail({
    from: process.env.SMTP_FROM || '"AgriCompass" <noreply@agricompass.com>',
    to: job.to,
    subject: job.subject,
    html: job.html,
  });
}

export default {
  enqueueEmail,
};
