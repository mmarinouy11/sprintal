import { test, expect } from '@playwright/test';
import { loginAndGo } from './helpers/auth';

test.describe('BIL — Facturación', () => {

  test('BIL-01 — Página de precios carga públicamente', async ({ browser }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await context.newPage();
    await page.goto(`${process.env.PLAYWRIGHT_BASE_URL}/pricing`);
    await expect(page.locator('body')).toBeVisible({ timeout: 15000 });
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-results/bil-01-pricing.png', fullPage: true });
    await expect(page.locator('text=Starter').first()).toBeVisible({ timeout: 8000 });
    await context.close();
  });

  test('BIL-03 — Botón plan gratuito lleva a registro', async ({ browser }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await context.newPage();
    await page.goto(`${process.env.PLAYWRIGHT_BASE_URL}/pricing`);
    await page.waitForLoadState('networkidle');
    const freeBtn = page.locator('a[href*="signup"], button:has-text("Empezar gratis"), a:has-text("Empezar gratis")').first();
    await expect(freeBtn).toBeVisible({ timeout: 10000 });
    await freeBtn.click();
    await expect(page).toHaveURL(/\/(auth\/signup|signup)/);
    await context.close();
  });

  test('BIL-08 — Feature gate en Cerrar Sprint', async ({ page }) => {
    const ORG = process.env.TEST_ORG_SLUG;
    await loginAndGo(page, `/${ORG}/billing`);
    await page.waitForTimeout(500);
    const isTrial = await page.locator('text=Trial').isVisible({ timeout: 3000 });
    if (!isTrial) {
      test.skip(true, 'Test user is not on Trial plan');
      return;
    }
    await page.goto(`/${ORG}/new/closure`);
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(500); // let React hydrate
    await page.screenshot({ path: 'test-results/bil-08-state.png', fullPage: true });
    const upgradeContent = page.locator('[data-testid="upgrade-modal"]').or(
      page.locator('text=Solo').or(
        page.locator('text=upgrade').or(
          page.locator('text=plan')
        )
      )
    );
    await expect(upgradeContent.first()).toBeVisible({ timeout: 8000 });
  });

});
