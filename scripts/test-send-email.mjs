import path from 'path';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

// Load .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const host = process.env.SMTP_HOST;
const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
const service = process.env.SMTP_SERVICE;
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;
const secureEnv = process.env.SMTP_SECURE;
const secure = secureEnv === 'true' || secureEnv === '1' || (port === 465);

console.log('SMTP config (from .env):', { host, port, service, user: user ? '***' : null, secure, SMTP_FROM: process.env.SMTP_FROM || null });

let transporter;
if (host) {
  const opts = { host, port: port || 587, secure: !!secure };
  if (user && pass) opts.auth = { user, pass };
  transporter = nodemailer.createTransport(opts);
} else if (service === 'gmail' && user && pass) {
  transporter = nodemailer.createTransport({ service: 'gmail', auth: { user, pass } });
} else {
  console.log('No SMTP configuration detected in .env');
  process.exit(2);
}

(async () => {
  try {
    console.log('Verifying transporter (this may produce detailed errors) ...');
    await transporter.verify();
    console.log('Transporter verified OK');
  } catch (err) {
    console.error('Transporter verify failed:');
    console.error(err && err.stack ? err.stack : err);
  }

  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || '"AgriCompass" <noreply@agricompass.com>',
      to: user || 'test@example.com',
      subject: 'AgriCompass test message',
      text: 'This is a test message from AgriCompass test-send-email script',
    });

    console.log('sendMail result:', info);
  } catch (err) {
    console.error('sendMail failed:');
    console.error(err && err.stack ? err.stack : err);
    process.exit(1);
  }
})();
