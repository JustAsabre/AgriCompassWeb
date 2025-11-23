import { test, expect } from '@playwright/test';
import { registerAndLogin } from './helpers/auth';

test.describe('Create Listing E2E - Clean', () => {
  test('file upload preview and listing create shows in marketplace', async ({ page }) => {
    const { email } = await registerAndLogin(page, 'farmer');
    await page.goto('/login');
    await page.fill('[data-testid="input-email"]', email);
    await page.fill('[data-testid="input-password"]', 'password');
    await page.click('button[type="submit"]');

    await page.goto('/farmer/create-listing');
    await page.fill('[data-testid="input-product-name"]', 'E2E Listing Test Item');
    await page.click('[data-testid="select-category"]');
    await page.getByRole('option', { name: 'Vegetables' }).click();
    await page.fill('[data-testid="input-description"]', 'E2E test listing created by Playwright');
    await page.fill('[data-testid="input-price"]', '5.00');
    await page.click('[data-testid="select-unit"]');
    await page.getByRole('option', { name: 'kg' }).click();
    await page.fill('[data-testid="input-quantity"]', '100');
    await page.fill('[data-testid="input-moq"]', '10');
    await page.fill('[data-testid="input-location"]', 'North Region');
    const fileInput = page.locator('input[type=file]');
    await fileInput.setInputFiles('tests/e2e/fixtures/sample.png');
    await page.waitForSelector('img[alt="Product preview"]');
    await page.click('[data-testid="button-submit"]');
    await page.waitForLoadState('networkidle');
    await page.goto('/marketplace');
    await expect(page.getByText('E2E Listing Test Item')).toBeVisible();
  });
});
