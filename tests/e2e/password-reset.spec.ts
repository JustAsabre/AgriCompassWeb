import { test, expect } from '@playwright/test';

test.describe('Password Reset (E2E)', () => {
  test('forgot password via UI and reset via reset link', async ({ page, context }) => {
    // Seed an account for buyer
    const seed = await page.request.post('/__test/seed-account', { data: { role: 'buyer' } });
    expect(seed.ok()).toBeTruthy();
    const seedBody = await seed.json();
    const email = seedBody.email;

    // Trigger forgot-password through UI
    await page.goto('http://127.0.0.1:5000/forgot-password');
    await page.fill('[data-testid="input-email"], input[type="email"]', email);
    await page.click('button[type="submit"]');
    await page.waitForSelector('text=Check Your Email', { timeout: 5000 });

    // Use test endpoint to retrieve reset token
    const tokenResp = await page.request.post('/__test/get-reset-token', { data: { email } });
    expect(tokenResp.ok()).toBeTruthy();
    const tokenBody = await tokenResp.json();
    const token = tokenBody.resetToken;
    expect(token).toBeTruthy();

    // Go to reset page with token
    await page.goto(`http://127.0.0.1:5000/reset-password?token=${token}`);
    await page.fill('input[name="password"]', 'newpassword123');
    await page.fill('input[name="confirmPassword"]', 'newpassword123');
    await page.click('button[type="submit"]');
    await page.waitForSelector('text=Password Reset Successful', { timeout: 5000 });

    // Login using new password via UI
    await page.goto('http://127.0.0.1:5000/login');
    await page.fill('[data-testid="input-email"]', email);
    await page.fill('[data-testid="input-password"]', 'newpassword123');
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');

    // Confirm login success by visiting profile
    await page.goto('http://127.0.0.1:5000/profile');
    await expect(page.locator(`text=${email}`)).toBeVisible();
  });
});
