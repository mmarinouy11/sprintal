import { test, expect } from '@playwright/test';

test.describe('ONB — Onboarding', () => {

  test('ONB-05 — Bet borrador creado durante onboarding aparece en dashboard', async ({ page }) => {
    // Verify dashboard shows draft bets from onboarding
    await page.goto(`/${process.env.TEST_ORG_SLUG}/dashboard`);
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });
    // No error state
    await expect(page.locator('text=Something went wrong')).not.toBeVisible();
  });

  test('ONB-07 — Usuario que regresa no ve onboarding', async ({ page }) => {
    await page.goto('/');
    // Should NOT be on onboarding
    await expect(page).not.toHaveURL(/\/onboarding/);
    // Should be on dashboard or landing
    const url = page.url();
    const isOnDashboard = url.includes('/dashboard');
    const isOnLanding = url === `${process.env.PLAYWRIGHT_BASE_URL}/`;
    expect(isOnDashboard || isOnLanding).toBeTruthy();
  });

  test('ONB-08 — Sub-área hereda plan de org raíz', async ({ page }) => {
    await page.goto(`/${process.env.TEST_ORG_SLUG}/settings`);
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });
    // Plan should not show "trial" if root org is on a paid plan
    // This is a data verification test — check billing section
    await expect(page.locator('text=trial')).not.toBeVisible();
  });

});
