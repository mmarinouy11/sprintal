import { test, expect } from '@playwright/test';
import { TEST_USER } from './helpers/auth';

const ORG = process.env.TEST_ORG_SLUG;

test.describe('SIG Flow — Chequeo de señal completo', () => {

  test('SIG — Formulario de chequeo de señal se puede completar', async ({ page }) => {
    await page.goto(`/${ORG}/new/signal`);
    if (page.url().includes('/auth/login')) {
      await page.fill('input[type="email"]', TEST_USER.email);
      await page.fill('input[type="password"]', TEST_USER.password);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 15000 });
      await page.goto(`/${ORG}/new/signal`);
    }
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'test-results/sig-form-state.png' });

    const noBets = page.locator('text=No hay bets').or(page.locator('text=No active'));
    if (await noBets.isVisible({ timeout: 3000 })) {
      test.skip(true, 'No active bets for signal check');
      return;
    }

    const strongOption = page.locator('[data-testid="signal-option-strong"]');
    if (await strongOption.isVisible({ timeout: 3000 })) {
      await strongOption.click();
    }

    const submitBtn = page.locator('button[type="submit"]').first();
    await expect(submitBtn).toBeVisible({ timeout: 5000 });
    await expect(submitBtn).toBeEnabled();
  });

  test('SIG — Historial de señal visible en panel de bet', async ({ page }) => {
    await page.goto(`/${ORG}/bets/board`);
    if (page.url().includes('/auth/login')) {
      await page.fill('input[type="email"]', TEST_USER.email);
      await page.fill('input[type="password"]', TEST_USER.password);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 15000 });
      await page.goto(`/${ORG}/bets/board`);
    }
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });

    const firstBet = page.locator('[data-testid="bet-card"]').first();
    if (!await firstBet.isVisible({ timeout: 5000 })) {
      test.skip(true, 'No bets in test org');
      return;
    }
    await firstBet.click();
    await expect(page.locator('[data-testid="bet-detail-panel"]')).toBeVisible({ timeout: 8000 });
    await page.screenshot({ path: 'test-results/sig-history-panel.png' });
    await expect(page.locator('text=Something went wrong')).not.toBeVisible();
  });

});
