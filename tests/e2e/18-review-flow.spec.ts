import { test, expect } from '@playwright/test';
import { TEST_USER } from './helpers/auth';

const ORG = process.env.TEST_ORG_SLUG;

test.describe('REV Flow — Revisión estratégica completa', () => {

  test('REV — Formulario carga con bet disponible', async ({ page }) => {
    await page.goto(`/${ORG}/new/review`);
    if (page.url().includes('/auth/login')) {
      await page.fill('input[type="email"]', TEST_USER.email);
      await page.fill('input[type="password"]', TEST_USER.password);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 15000 });
      await page.goto(`/${ORG}/new/review`);
    }
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'test-results/rev-form-state.png' });
    await expect(page.locator('text=Something went wrong')).not.toBeVisible();
  });

  test('REV — Campos requeridos presentes en formulario', async ({ page }) => {
    await page.goto(`/${ORG}/new/review`);
    if (page.url().includes('/auth/login')) {
      await page.fill('input[type="email"]', TEST_USER.email);
      await page.fill('input[type="password"]', TEST_USER.password);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 15000 });
      await page.goto(`/${ORG}/new/review`);
    }
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'test-results/rev-fields-state.png' });

    const noBets = page.locator('text=No hay bets').or(page.locator('text=No active'));
    if (await noBets.isVisible({ timeout: 3000 })) {
      test.skip(true, 'No active bets for review');
      return;
    }

    const requiredFields = page.locator('[required]');
    const count = await requiredFields.count();
    expect(count).toBeGreaterThan(0);
    await expect(page.locator('text=Something went wrong')).not.toBeVisible();
  });

});
