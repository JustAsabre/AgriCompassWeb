import { Page } from '@playwright/test';

export async function registerViaApi(page: Page, role: string, email?: string) {
  // If an explicit email is provided, skip the seeded-account fast-path and create a unique account
  if (email) {
    const testEmail = email;
    const resp = await page.request.post('/api/auth/register', {
      data: { email: testEmail, password: 'password', fullName: `E2E ${role}`, role },
    });
    if (!resp.ok()) {
      const text = await resp.text();
      console.log('Registration failed:', resp.status(), text);
      throw new Error(`Failed to register via API: ${resp.status()} ${text}`);
    }
    return { email: testEmail, password: 'password' };
  }

  // Prefer a seeded account if the test helper endpoint is available and no explicit email requested
  try {
    const seedResp = await page.request.post('/__test/seed-account', { data: { role } });
    if (seedResp.ok()) {
      const body = await seedResp.json();
      return { email: body.email, password: body.password };
    }
  } catch (e) {
    // ignore and fall back to normal registration
  }

  const testEmail = `${role}+${Date.now()}@test.com`;
  const resp = await page.request.post('/api/auth/register', {
    data: { email: testEmail, password: 'password', fullName: `E2E ${role}`, role },
  });
  if (!resp.ok()) {
    const text = await resp.text();
    console.log('Registration failed:', resp.status(), text);
    throw new Error(`Failed to register via API: ${resp.status()} ${text}`);
  }
  return { email: testEmail, password: 'password' };
}

export async function loginViaUI(page: Page, email: string, password = 'password') {
  await page.goto('/login');
  await page.fill('[data-testid="input-email"], input[type="email"]', email);
  await page.fill('[data-testid="input-password"], input[type="password"]', password);
  await page.click('button[type="submit"]');
  // Wait until profile page or dashboard loads; the dev server should redirect after login
  await page.waitForLoadState('networkidle');
}

export async function registerAndLogin(page: Page, role: string, email?: string) {
  const creds = await registerViaApi(page, role, email);
  await loginViaUI(page, creds.email, creds.password);
  return creds;
}

export default { registerViaApi, loginViaUI, registerAndLogin };
