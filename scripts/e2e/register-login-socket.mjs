/*
  E2E script: register -> login -> socket connect
  Usage:
    node scripts/e2e/register-login-socket.mjs [serverUrl]

  Requires Node 18+ (global fetch) and the project's `socket.io-client` dependency.
*/
import { io } from 'socket.io-client';

const serverUrl = process.argv[2] || process.env.SERVER_URL || 'http://127.0.0.1:5000';

async function postJson(path, body, headers = {}) {
  const res = await fetch(`${serverUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
    redirect: 'manual',
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch (e) { /* ignore */ }
  return { res, body: json, text, headers: res.headers };
}

function extractCookieHeader(setCookieHeader) {
  if (!setCookieHeader) return undefined;
  if (Array.isArray(setCookieHeader)) {
    return setCookieHeader.map(c => c.split(';')[0]).join('; ');
  }
  return setCookieHeader.split(';')[0];
}

async function run() {
  console.log('E2E: serverUrl=', serverUrl);

  // Register
  const reg = await postJson('/api/auth/register', {
    email: `e2e+${Date.now()}@example.com`,
    password: 'password123',
    fullName: 'E2E User',
    role: 'buyer',
  });
  if (!reg.res.ok) {
    console.error('Registration failed', reg.res.status, reg.text);
    process.exit(2);
  }
  console.log('Registered user:', reg.body?.user?.email || 'unknown');

  // Login to obtain session cookie (some servers set cookie on register, but attempt login)
  const login = await postJson('/api/auth/login', {
    email: reg.body.user.email,
    password: 'password123',
  });
  if (!login.res.ok) {
    console.error('Login failed', login.res.status, login.text);
    process.exit(2);
  }

  // Extract cookie header (prefer login, fallback to register)
  const loginSet = login.headers.get('set-cookie');
  const regSet = reg.headers.get('set-cookie');
  const cookieHeader = extractCookieHeader(loginSet || regSet);
  if (!cookieHeader) {
    console.error('No session cookie set by server');
    process.exit(2);
  }

  console.log('Captured cookie:', cookieHeader.split('=')[0]);

  // Connect socket.io with Cookie header
  const socket = io(serverUrl, {
    extraHeaders: {
      Cookie: cookieHeader,
    },
    reconnection: false,
  });

  const authenticated = await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout waiting for authenticated')), 8000);
    socket.on('authenticated', (data) => {
      clearTimeout(t);
      resolve(data);
    });
    socket.on('connect_error', (err) => { clearTimeout(t); reject(err); });
    socket.on('connect', () => console.log('socket connected, waiting for server auth...'));
  }).catch(err => { console.error('Socket error', err); return null; });

  if (!authenticated) {
    console.error('Socket did not authenticate');
    socket.disconnect();
    process.exit(3);
  }

  console.log('Socket authenticated:', authenticated);
  socket.disconnect();
  console.log('E2E success');
  process.exit(0);
}

run().catch((err) => { console.error(err); process.exit(1); });
