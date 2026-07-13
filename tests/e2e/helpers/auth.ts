import { Page, expect } from '@playwright/test';

export const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'test@sprintal.dev',
  password: process.env.TEST_USER_PASSWORD || 'TestPassword123!',
  orgSlug: process.env.TEST_ORG_SLUG || 'test-org',
};

export async function loginAs(page: Page, email = TEST_USER.email, password = TEST_USER.password) {
  await page.goto('/auth/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  // Wait for either dashboard or onboarding (both are valid post-login states)
  await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 15000 });
  // If landed on onboarding, fail with a clear message
  const url = page.url();
  if (url.includes('/onboarding')) {
    throw new Error(
      `Test user landed on onboarding — complete the onboarding manually first.\nURL: ${url}`
    );
  }
}

export async function loginAndGo(page: Page, path: string) {
  await page.goto('/auth/login');
  await page.fill('input[type="email"]', TEST_USER.email);
  await page.fill('input[type="password"]', TEST_USER.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 15000 });
  await page.goto(path);
  await expect(page.locator('main')).toBeVisible({ timeout: 10000 });
}

export async function logout(page: Page) {
  // Click logout from sidebar
  await page.click('[data-testid="logout-btn"]');
  await page.waitForURL('/auth/login');
}
