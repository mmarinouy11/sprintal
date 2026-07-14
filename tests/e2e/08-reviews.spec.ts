import { test, expect } from '@playwright/test';
import { loginAndWaitForOrgContext, TEST_USER } from './helpers/auth';

const ORG = process.env.TEST_ORG_SLUG;

test.describe('REV — Revisión Estratégica', () => {

  test.beforeEach(async ({ page }) => {
    await loginAndWaitForOrgContext(page);
  });

  test('REV — Formulario de revisión accesible', async ({ page }) => {
    await page.goto(`/${ORG}/new/review`);

    if (page.url().includes('login')) {
      await page.fill('input[type="email"]', TEST_USER.email);
      await page.fill('input[type="password"]', TEST_USER.password);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 15000 });
      await page.goto(`/${ORG}/new/review`);
    }

    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });
    const form = page.locator('form, [data-testid="review-form"]');
    const emptyState = page.locator('text=No hay bets').or(page.locator('text=No active bets'));
    await expect(form.or(emptyState)).toBeVisible({ timeout: 8000 });
  });

  test('REV-07 — Sidebar muestra cadencia de revisión correcta', async ({ page }) => {
    await page.goto(`/${ORG}/new/review`);

    if (page.url().includes('login')) {
      await page.fill('input[type="email"]', TEST_USER.email);
      await page.fill('input[type="password"]', TEST_USER.password);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 15000 });
      await page.goto(`/${ORG}/new/review`);
    }

    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });
    const cadence = page.locator('text=33%').or(
      page.locator('text=66%').or(page.locator('text=90%'))
    );
    await expect(cadence.first()).toBeVisible({ timeout: 8000 });
  });

  test('REV-10 — No se puede enviar sin campos requeridos', async ({ page }) => {
    await page.goto(`/${process.env.TEST_ORG_SLUG}/new/review`);

    if (page.url().includes('login')) {
      await page.fill('input[type="email"]', TEST_USER.email);
      await page.fill('input[type="password"]', TEST_USER.password);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 15000 });
      await page.goto(`/${process.env.TEST_ORG_SLUG}/new/review`);
    }

    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });
    const submitBtn = page.locator('button[type="submit"]').first();
    if (await submitBtn.isVisible({ timeout: 5000 })) {
      // Check HTML5 validation is in place (required fields)
      const hasRequiredFields = await page.locator('[required]').count();
      expect(hasRequiredFields).toBeGreaterThan(0);
    } else {
      test.skip(true, 'No submit button found');
    }
  });

});
