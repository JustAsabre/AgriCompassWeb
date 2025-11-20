import path from 'path';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const host = process.env.SMTP_HOST;
const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;
const secureEnv = process.env.SMTP_SECURE;
const secure = secureEnv === 'true' || secureEnv === '1' || (port === 465);

console.log('Using .env:', { host, port, user: user ? '***' : null, secure });

async function tryTransport(opts, label) {
  console.log('\n--- TRY TRANSPORT:', label, '---');
  const transporter = nodemailer.createTransport({ ...opts, logger: true, debug: true });
  try {
    console.log('verifying...');
    await transporter.verify();
    console.log('verify OK');
  } catch (err) {
    console.error('verify failed:', err && err.stack ? err.stack : err);
  }

  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || '"AgriCompass" <noreply@agricompass.com>',
      to: user || 'test@example.com',
      subject: `AgriCompass debug test (${label})`,
      text: `Debug test for ${label}`,
    });
    console.log('sendMail ok:', info);
  } catch (err) {
    console.error('sendMail error:', err && err.stack ? err.stack : err);
  }
}

(async () => {
  if (host) {
    await tryTransport({ host, port: port || 587, secure: !!secure, auth: (user && pass) ? { user, pass } : undefined }, 'host-smtp');
  }

  // Try service: gmail if available
  if (user && pass) {
    await tryTransport({ service: 'gmail', auth: { user, pass } }, 'service-gmail');
  }

  console.log('\nDone');
})();
