import { setTimeout as wait } from 'timers/promises';
import { type SentMessageInfo } from 'nodemailer';
import { log } from './log';
import nodemailer from 'nodemailer';
import sgMail from '@sendgrid/mail';

// Initialize SendGrid if API key is provided
const sendgridApiKey = process.env.SENDGRID_API_KEY;
if (sendgridApiKey) {
  sgMail.setApiKey(sendgridApiKey);
  log('SendGrid API configured');
}

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
  // Determine from address based on which service we're using
  // SendGrid requires a verified sender, so prioritize SENDGRID_FROM when using SendGrid
  const usingSendGrid = !!process.env.SENDGRID_API_KEY;
  const fromEmail = usingSendGrid 
    ? (process.env.SENDGRID_FROM || process.env.SMTP_FROM || 'noreply@agricompass.com')
    : (process.env.SMTP_FROM || process.env.SENDGRID_FROM || 'noreply@agricompass.com');
  const fromName = process.env.SENDGRID_FROM_NAME || 'AgriCompass';
  
  // Priority 1: Use SendGrid API if configured (works on Render free tier)
  if (process.env.SENDGRID_API_KEY) {
    try {
      const msg = {
        to: job.to,
        from: {
          email: fromEmail,
          name: fromName,
        },
        subject: job.subject,
        html: job.html,
      };
      await sgMail.send(msg);
      log(`Email sent via SendGrid API to ${job.to}`);
      return { messageId: `sendgrid-${job.id}` } as SentMessageInfo;
    } catch (err: any) {
      const errorMessage = err?.response?.body?.errors?.[0]?.message || err?.message || String(err);
      log(`SendGrid API error for job ${job.id}: ${errorMessage}`);
      throw new Error(`SendGrid: ${errorMessage}`);
    }
  }

  // Priority 2: Fall back to SMTP (may not work on some hosts like Render free tier)
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

  // Give more detailed diagnostics: verify connection/auth before sending so errors are clearer.
  try {
    // Set reasonable timeouts
    transporter.options = transporter.options || {};
    transporter.options.connectionTimeout = transporter.options.connectionTimeout || 10000;
    transporter.options.greetingTimeout = transporter.options.greetingTimeout || 5000;
    transporter.options.socketTimeout = transporter.options.socketTimeout || 20000;

    await transporter.verify();
  } catch (err: any) {
    // Throw a wrapped error so callers can see stack and message
    const e = err instanceof Error ? err : new Error(String(err));
    log(`SMTP verify error for job ${job.id}: ${e.message}`);
    e.name = 'SmtpVerifyError';
    throw e;
  }

  try {
    return await transporter.sendMail({
      from: process.env.SMTP_FROM || '"AgriCompass" <noreply@agricompass.com>',
      to: job.to,
      subject: job.subject,
      html: job.html,
    });
  } catch (err: any) {
    const e = err instanceof Error ? err : new Error(String(err));
    log(`SMTP sendMail error for job ${job.id}: ${e.message}`);
    if (e.stack) log(e.stack);
    throw e;
  }
}

export default {
  enqueueEmail,
};
