import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express, { type Express } from 'express';
import { createServer } from 'http';
import { registerRoutes } from '../routes';
import { initializeSocket } from '../socket';
import sessionMiddleware from '../session';
import { io as ClientIO, Socket as ClientSocket } from 'socket.io-client';

describe('Socket.IO authentication', () => {
  let app: Express;
  let httpServer: any;
  let serverUrl = '';
  let clientSocket: ClientSocket | null = null;

  beforeEach(async () => {
    app = express();
    app.use(express.json());
    app.use(sessionMiddleware as any);
    httpServer = createServer(app);
    await registerRoutes(app, httpServer);
    initializeSocket(httpServer);
    await new Promise<void>((resolve) => {
      httpServer.listen(0, '127.0.0.1', () => {
        const port = httpServer.address().port;
        serverUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  afterEach(() => {
    if (clientSocket) {
      clientSocket.disconnect();
      clientSocket = null;
    }
    if (httpServer && httpServer.listening) {
      httpServer.close();
    }
  });

  it('authenticates socket with session cookie after login', async () => {
    const agent = request.agent(app as any);

    // Register a user
    const registerRes = await agent.post('/api/auth/register').send({
      email: 'socket-test@example.com',
      password: 'password123',
      fullName: 'Socket Test',
      role: 'buyer',
    });
    expect(registerRes.status).toBe(201);

    // Login to create session cookie
    const loginRes = await agent.post('/api/auth/login').send({
      email: 'socket-test@example.com',
      password: 'password123',
    });
    expect(loginRes.status).toBe(200);

    // Prefer cookie from login response; fall back to register response if needed
    let setCookie = loginRes.headers['set-cookie'];
    if (!setCookie) setCookie = registerRes.headers['set-cookie'];
    expect(setCookie).toBeDefined();

    const cookieHeader = Array.isArray(setCookie) ? setCookie.map((c) => c.split(';')[0]).join('; ') : setCookie.split(';')[0];

    // Connect socket.io client with Cookie header
    clientSocket = ClientIO(serverUrl, {
      extraHeaders: {
        Cookie: cookieHeader,
      },
      reconnection: false,
    }) as unknown as ClientSocket;

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('timeout waiting for authenticated event')), 3000);
      clientSocket!.on('connect', () => {
        // Wait for server to emit authenticated
      });
      clientSocket!.on('authenticated', (data: any) => {
        clearTimeout(timer);
        try {
          expect(data).toHaveProperty('userId');
          resolve();
        } catch (e) {
          reject(e);
        }
      });
      clientSocket!.on('connect_error', (err: any) => reject(err));
    });
  });

  it('does not emit duplicate authenticated events when client also emits authenticate', async () => {
    const agent = request.agent(app as any);
    const registerRes = await agent.post('/api/auth/register').send({ email: 'dupuser@example.com', password: 'password123', fullName: 'Dup User', role: 'buyer' });
    expect(registerRes.status).toBe(201);
    const loginRes = await agent.post('/api/auth/login').send({ email: 'dupuser@example.com', password: 'password123' });
    expect(loginRes.status).toBe(200);
    const setCookie = loginRes.headers['set-cookie'];
    expect(setCookie).toBeDefined();
    const cookieHeader = Array.isArray(setCookie) ? setCookie.map((c) => c.split(';')[0]).join('; ') : setCookie.split(';')[0];

    clientSocket = ClientIO(serverUrl, { extraHeaders: { Cookie: cookieHeader }, reconnection: false }) as unknown as ClientSocket;
    let authCount = 0;
    const promise = new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('timeout waiting for authenticated events')), 3000);
      clientSocket!.on('authenticated', (data: any) => {
        authCount += 1;
      });
      clientSocket!.on('connect', () => {
        // emit authenticate explicitly after small delay
        setTimeout(() => {
          clientSocket!.emit('authenticate', loginRes.body.user?.id || '');
        }, 200);
        // wait shortly and resolve
        setTimeout(() => {
          clearTimeout(timer);
          try {
            expect(authCount).toBe(1);
            resolve();
          } catch (e) { reject(e); }
        }, 800);
      });
      clientSocket!.on('connect_error', (err: any) => reject(err));
    });
    await promise;
  });
});
