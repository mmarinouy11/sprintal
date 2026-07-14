import { Page, expect } from '@playwright/test';

export const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'test@sprintal.dev',
  password: process.env.TEST_USER_PASSWORD || 'TestPassword123!',
  orgSlug: process.env.TEST_ORG_SLUG || 'test-org',
};

export async function loginAndWaitForOrgContext(page: Page) {
  await page.goto(`/${process.env.TEST_ORG_SLUG}/dashboard`);

  // Wait for navigation to settle — could redirect to login
  await page.waitForURL(/\/(dashboard|auth\/login|onboarding)/, { timeout: 10000 });

  // If redirected to login, do explicit login
  if (page.url().includes('/auth/login')) {
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 15000 });

    if (page.url().includes('/onboarding')) {
      await page.goto(`/${process.env.TEST_ORG_SLUG}/dashboard`);
      await page.waitForURL(/\/dashboard/, { timeout: 10000 });
    }
  }

  // Wait for org context to be established
  await expect(page.locator('[data-testid="org-switcher"]')).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(1000);
}

export async function loginAndGoToBetsBoard(page: Page) {
  // Step 1: establish org context via dashboard
  await loginAndWaitForOrgContext(page);

  // Step 2: wait for dashboard to fully load — metrics bar confirms org data loaded
  await expect(page.locator('[data-testid="metrics-bar"]')).toBeVisible({ timeout: 15000 });
  await page.waitForTimeout(3000); // give store extra time to fully populate

  // Step 3: navigate to bets board
  await page.goto(`/${process.env.TEST_ORG_SLUG}/bets/board`);
  await expect(page.locator('main')).toBeVisible({ timeout: 15000 });

  // Step 4: wait up to 15s for bet content to appear
  // Poll every 500ms — board may show "No bets yet" briefly while store loads
  let attempts = 0;
  while (attempts < 30) {
    const betCards = await page.locator('[data-testid="bet-card"]').count();
    if (betCards > 0) break;

    // Check if we see column headers (board loaded but bets collapsed)
    const hasColumns = await page.locator('text=ACTIVE').or(
      page.locator('text=ACTIVA')
    ).isVisible().catch(() => false);
    if (hasColumns) break;

    await page.waitForTimeout(500);
    attempts++;
  }

  await page.waitForTimeout(300);
}

export async function gotoWithConditionalAuth(page: Page, path: string) {
  await page.goto(path);
  if (page.url().includes('/auth/login')) {
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 15000 });
    await page.goto(path);
  }
  await expect(page.locator('main')).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(500);
}

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
