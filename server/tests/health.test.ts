import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import session from 'express-session';
import { createServer } from 'http';
import { registerRoutes } from '../routes';

describe('Health endpoints', () => {
  let app: any;
  let httpServer: any;

  beforeEach(async () => {
    app = express();
    app.use(express.json());
    app.use(session({ secret: 'test-secret', resave: false, saveUninitialized: false }));
    httpServer = createServer(app);
    await registerRoutes(app, httpServer);
  });

  it('/api/health returns basic status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('ok', true);
    expect(res.body).toHaveProperty('message');
    expect(res.body).toHaveProperty('timestamp');
  });

  it('/api/health?verbose=1 returns checks', async () => {
    const res = await request(app).get('/api/health?verbose=1');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('checks');
    const checks = res.body.checks;
    expect(checks).toHaveProperty('db');
    expect(checks).toHaveProperty('redis');
    expect(checks).toHaveProperty('smtp');
    expect(checks).toHaveProperty('storage');
  });
});
