import request from 'supertest';
import express, { type Express } from 'express';
import session from 'express-session';
import { createServer } from 'http';
import { registerRoutes } from '../routes';

import { registerAndLoginAgent } from './helpers/auth';

describe('Officer verifications', () => {
  let app: Express;
  let server: any;
  let httpServer: any;

  beforeEach(async () => {
    app = express();
    app.use(express.json());
    app.use(session({ secret: 'test-secret', resave: false, saveUninitialized: false, cookie: { secure: false } }));
    httpServer = createServer(app);
    await registerRoutes(app, httpServer);
  });

  afterEach(() => {
    if (httpServer && httpServer.listening) httpServer.close();
  });

  it('returns only submitted verification requests', async () => {
    // Create a field officer using the helper that persists cookies
    const { agent: officerAgent } = await registerAndLoginAgent(app, 'field_officer');

    // Create a farmer but don't submit verification
    await request(app).post('/api/auth/register').send({ email: `nofarm+${Date.now()}@test.com`, password: 'password', fullName: 'No Farm', role: 'farmer' });

    // Create another farmer and submit verification
    const { agent: farmerAgent, email: farmerEmail } = await registerAndLoginAgent(app, 'farmer');

    const submit = await farmerAgent.post('/api/verifications/request')
      .send({ farmSize: '10 acres', farmLocation: 'Accra', experienceYears: 5, additionalInfo: 'For testing' });
    expect(submit.status).toBe(200);

    const resGet = await officerAgent.get('/api/verifications');
    expect(resGet.status).toBe(200);
    const verifications = resGet.body;
    expect(Array.isArray(verifications)).toBe(true);
    expect(verifications.length).toBe(1);
    expect(verifications[0].farmerId).toBe(submit.body.farmerId);
  });
});
