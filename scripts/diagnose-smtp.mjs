import net from 'net';
import tls from 'tls';
import path from 'path';
import dotenv from 'dotenv';

// Load .env from project root so this script can be run directly
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const host = process.env.SMTP_HOST || null;
const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : null;
const user = process.env.SMTP_USER || null;
const service = process.env.SMTP_SERVICE || null;
const secureEnv = process.env.SMTP_SECURE;
const secure = secureEnv === 'true' || secureEnv === '1' || (port === 465);

console.log('SMTP env:');
console.log({ host, port, user, service, secure, SMTP_FROM: process.env.SMTP_FROM || null });

if (!host && !service) {
  console.log('No SMTP host or service configured in environment — server will log emails instead of sending.');
  process.exit(0);
}

if (!host) {
  console.log('SMTP_SERVICE is set; network connectivity test skipped for service shortcuts.');
  process.exit(0);
}

const timeoutMs = 5000;
console.log(`Testing TCP connectivity to ${host}:${port || 587} (timeout ${timeoutMs}ms) ...`);

const tryConnect = () => new Promise((resolve) => {
  const targetPort = port || 587;
  const socket = (secure ? tls.connect : net.connect)(targetPort, host, () => {
    console.log('Connected to SMTP server — TCP connection successful.');
    socket.end();
    resolve({ ok: true });
  });
  socket.setTimeout(timeoutMs, () => {
    console.error('Connection timed out');
    socket.destroy();
    resolve({ ok: false, reason: 'timeout' });
  });
  socket.on('error', (err) => {
    console.error('Connection error:', err && err.message ? err.message : err);
    resolve({ ok: false, reason: err && err.message ? err.message : String(err) });
  });
});

tryConnect().then(res => {
  if (!res.ok) process.exit(2);
  process.exit(0);
});
