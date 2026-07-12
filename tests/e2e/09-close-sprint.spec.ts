import { test, expect } from '@playwright/test';

const ORG = process.env.TEST_ORG_SLUG;

test.describe('CLO — Cierre de Sprint', () => {

  test('CLO-01 — Cierre de Sprint accesible (plan Solo+)', async ({ page }) => {
    await page.goto(`/${ORG}/new/closure`);
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });
    // Either the wizard loads or a feature gate is shown
    const wizard = page.locator('form, [data-testid="closure-form"]');
    const gate = page.locator('[data-testid="upgrade-modal"]').or(
      page.locator('text=requiere').or(page.locator('text=upgrade'))
    );
    await expect(wizard.or(gate)).toBeVisible({ timeout: 8000 });
  });

  test('CLO-07 — Página de cierre carga sin errores', async ({ page }) => {
    await page.goto(`/${ORG}/new/closure`);
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Something went wrong')).not.toBeVisible();
    await expect(page.locator('text=500')).not.toBeVisible();
  });

});
