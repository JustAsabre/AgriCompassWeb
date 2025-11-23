import request from 'supertest';
import { Express } from 'express';

export async function registerAndLoginAgent(app: Express, role: string, email?: string) {
  const uniqueEmail = email ?? `${role}+${Date.now()}@test.com`;
  const agent = request.agent(app);
  const register = await agent.post('/api/auth/register').send({ email: uniqueEmail, password: 'password', fullName: `Test ${role}`, role });
  if (register.status !== 201) throw new Error('Failed to register agent');
  const login = await agent.post('/api/auth/login').send({ email: uniqueEmail, password: 'password' });
  if (login.status !== 200) throw new Error('Failed to log in agent');
  return { agent, email: uniqueEmail };
}

export default { registerAndLoginAgent };
