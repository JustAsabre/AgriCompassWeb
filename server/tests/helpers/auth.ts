import request from 'supertest';
import { Express } from 'express';
import { storage } from '../../storage';

export type RegisterAndLoginOptions = {
  /** Password to use for registration + login (default: "password"). */
  password?: string;
  /** Full name to use for registration (default: `Test ${role}`). */
  fullName?: string;
  /**
   * If true, sets `verified=true` in storage before login.
   * Useful for farmer flows that require a verified farmer (e.g. creating listings).
   */
  markVerified?: boolean;
};

export async function registerAndLoginAgent(
  app: Express,
  role: string,
  email?: string,
  options?: RegisterAndLoginOptions
) {
  const uniqueEmail = email ?? `${role}+${Date.now()}@test.com`;
  const password = options?.password ?? 'password1234';
  const fullName = options?.fullName ?? `Test ${role}`;

  const agent = request.agent(app);
  const register = await agent
    .post('/api/auth/register')
    .send({ email: uniqueEmail, password, fullName, role });
  if (register.status !== 201) throw new Error('Failed to register agent');

  // Verify email using the real verification endpoint.
  const user = await storage.getUserByEmail(uniqueEmail.toLowerCase());
  if (!user) throw new Error('Failed to fetch newly registered user');

  // In a perfectly clean test DB, a new user should always have a token.
  // However, to keep suites resilient (e.g., if a user was already verified), we tolerate
  // missing tokens when the user is already verified.
  if (!user.emailVerified) {
    let token = user.emailVerificationToken;

    // If a token is missing unexpectedly, attempt to request a fresh one.
    if (!token) {
      const resend = await agent.post('/api/auth/resend-verification').send({ email: uniqueEmail });
      if (resend.status !== 200 && resend.status !== 400) {
        throw new Error(`Failed to resend verification email (status ${resend.status})`);
      }

      const refreshed = await storage.getUserByEmail(uniqueEmail.toLowerCase());
      token = refreshed?.emailVerificationToken ?? null;
    }

    if (!token) {
      throw new Error('Missing email verification token for newly registered user');
    }

    const verify = await agent.get('/api/auth/verify-email').query({ token });
    if (verify.status !== 200) {
      throw new Error(`Failed to verify email (status ${verify.status})`);
    }
  }

  if (options?.markVerified) {
    // Mark the user as verified in storage before login so the session contains verified:true.
    // (This simulates an already-approved verification without weakening production logic.)
    await storage.updateUser(user.id, { verified: true });
  }

  const login = await agent.post('/api/auth/login').send({ email: uniqueEmail, password });
  if (login.status !== 200) throw new Error('Failed to log in agent');

  const finalUser = await storage.getUserByEmail(uniqueEmail.toLowerCase());
  if (!finalUser) throw new Error('Failed to fetch user after login');
  return { agent, email: uniqueEmail, userId: finalUser.id };
}

export default { registerAndLoginAgent };
