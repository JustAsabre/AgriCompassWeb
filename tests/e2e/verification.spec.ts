import { test, expect } from '@playwright/test';
import { registerAndLogin, loginViaUI } from './helpers/auth';

// Ensure the server is running locally. We'll register a farmer, submit verification, and then check officer dashboard.

test('field officer sees pending verification after farmer submits request', async ({ page }) => {
  const { email: farmerEmail } = await registerAndLogin(page, 'farmer');

  // Submit verification via the page context so cookies (session) are included
  const submitResult = await page.evaluate(async () => {
    const payload = { farmSize: '2 acres', farmLocation: 'Accra', experienceYears: 3, additionalInfo: 'E2E test' };
    const res = await fetch('/api/verifications/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const text = await res.text().catch(() => '');
    return { ok: res.ok, status: res.status, body: text };
  });
  expect(submitResult.ok).toBeTruthy();

  // Register the officer via API, then login via UI so page has session cookie
  const { email: officerEmail } = await registerAndLogin(page, 'field_officer');

  // Navigate to verifications list page (not dashboard)
  await page.goto('/officer/verifications');

  // Wait for verifications to show up - look for the farmer's name in pending tab
  await expect(page.locator('text=E2E farmer')).toBeVisible();

  // Check that there exists a card with 'Pending' badge (not the tab)
  await expect(page.locator('.text-secondary-foreground:has-text("Pending")')).toBeVisible();
});

test('field officer approving verification updates farmer verified status', async ({ page }) => {
  const uniqueEmail = `farmer+${Date.now()}@test.com`;
  const { email: farmerEmail } = await registerAndLogin(page, 'farmer', uniqueEmail);

  // Farmer submits verification
  const cookies = await page.context().cookies();
  const sessionCookie = cookies.find(c => c.name === 'connect.sid');
  const tokenResp = await page.request.get('/api/csrf-token');
  const csrf = tokenResp.ok() ? (await tokenResp.json()).csrfToken : undefined;
  const headers: any = { 'Cookie': `connect.sid=${sessionCookie?.value}` };
  if (csrf) headers['X-CSRF-Token'] = csrf;
  const submitResult2 = await page.evaluate(async () => {
    const payload = { farmSize: '2 acres', farmLocation: 'Accra', experienceYears: 3, additionalInfo: 'E2E test for approval' };
    const res = await fetch('/api/verifications/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const text = await res.text().catch(() => '');
    return { ok: res.ok, status: res.status, body: text };
  });
  if (!submitResult2.ok) console.error('Verification submit failed', submitResult2);
  expect(submitResult2.ok).toBeTruthy();

  // Register and login as officer to approve
  await registerAndLogin(page, 'field_officer');
  // Get verifications
  const verificationsResp = await page.request.get('/api/verifications', { headers });
  expect(verificationsResp.ok()).toBeTruthy();
  const verifications = await verificationsResp.json();
  const farmerVerification = verifications.find((v: any) => v.farmer.email === farmerEmail);
  expect(farmerVerification).toBeTruthy();
  const verificationId = farmerVerification.id;
  // Approve
  const approve = await page.request.patch(`/api/verifications/${verificationId}/review`, { data: { status: 'approved' }, headers });
  expect(approve.ok()).toBeTruthy();

  // Now log back in as farmer and check verified status
  await loginViaUI(page, farmerEmail);
  // Wait a bit for auth state to update
  await page.waitForTimeout(1000);
  await page.goto('/profile');
  // Debug: check if user is logged in
  const authCheck = await page.request.get('/api/auth/me');
  if (authCheck.ok()) {
    const authData = await authCheck.json();
    console.log('Auth data after login:', authData);
  }
  await expect(page.locator('text=Verified')).toBeVisible();
});
