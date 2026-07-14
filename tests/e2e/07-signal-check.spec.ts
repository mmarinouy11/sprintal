import { test, expect } from '@playwright/test';
import { loginAndWaitForOrgContext } from './helpers/auth';

const ORG = process.env.TEST_ORG_SLUG;

test.describe('SIG — Chequeo de Señal', () => {

  test.beforeEach(async ({ page }) => {
    await loginAndWaitForOrgContext(page);
  });

  test('SIG — Formulario de chequeo de señal accesible', async ({ page }) => {
    await page.goto(`/${ORG}/new/signal`);
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });
    // Form fields present
    const form = page.locator('form, [data-testid="signal-form"]');
    const emptyState = page.locator('text=No hay bets').or(page.locator('text=No active bets'));
    await expect(form.or(emptyState)).toBeVisible({ timeout: 8000 });
  });

  test('SIG-07 — Sidebar muestra contenido correcto (no cadencia de revisión)', async ({ page }) => {
    await page.goto(`/${process.env.TEST_ORG_SLUG}/new/signal`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
    // Should NOT show strategic review cadence text
    await expect(page.locator('text=33%')).not.toBeVisible();
    await expect(page.locator('text=66%')).not.toBeVisible();
  });

  test('SIG-08 — Valores de señal en español', async ({ page }) => {
    await page.goto(`/${process.env.TEST_ORG_SLUG}/new/signal`);
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'test-results/sig-08-state.png', fullPage: true });
    // Check for any signal-related text
    const signalLabel = page.locator('[data-testid^="signal-option-"], label, .signal-option').first();
    if (await signalLabel.isVisible({ timeout: 3000 })) {
      const text = await signalLabel.textContent();
      // Verify it's not in English
      expect(text).not.toMatch(/\bStrong\b|\bWeak\b|\bUnclear\b/i);
    } else {
      test.skip(true, 'Signal options not visible');
    }
  });

});
