import { Page } from '@playwright/test';

export async function registerViaApi(page: Page, role: string, email?: string) {
  const testEmail = email ?? `${role}+${Date.now()}@test.com`;
  const resp = await page.request.post('/api/auth/register', {
    data: { email: testEmail, password: 'password', fullName: `E2E ${role}`, role },
  });
  if (!resp.ok()) throw new Error('Failed to register via API');
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
