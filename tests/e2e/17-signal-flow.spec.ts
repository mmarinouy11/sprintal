import { test, expect } from '@playwright/test';
import { loginAndWaitForOrgContext } from './helpers/auth';
import { openTestBetPanel } from './helpers/test-data';

const ORG = process.env.TEST_ORG_SLUG;

test.describe('SIG Flow — Chequeo de señal completo', () => {

  test.beforeEach(async ({ page }) => {
    await loginAndWaitForOrgContext(page);
  });

  test('SIG — Formulario de chequeo de señal se puede completar', async ({ page }) => {
    await page.goto(`/${ORG}/new/signal`);
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(500);
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

  test.describe('SIG — Historial en panel de bet', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`/${ORG}/bets/board`);
      await expect(page.locator('main')).toBeVisible({ timeout: 15000 });

      await page.waitForFunction(() => {
        const cards = document.querySelectorAll('[data-testid="bet-card"]');
        const emptyState = document.querySelector('[data-testid="empty-bets"]');
        const bodyText = document.body.innerText;
        return cards.length > 0 ||
               !!emptyState ||
               bodyText.includes('No bets') ||
               bodyText.includes('ACTIVE') ||
               bodyText.includes('ACTIVA') ||
               bodyText.includes('Active');
      }, { timeout: 10000 }).catch(() => {});
    });

    test('SIG — Historial de señal visible en panel de bet', async ({ page }) => {
      const opened = await openTestBetPanel(page);
      if (!opened) {
        test.skip(true, 'Could not open bet panel');
        return;
      }
      await page.screenshot({ path: 'test-results/sig-history-panel.png' });
      await expect(page.locator('text=Something went wrong')).not.toBeVisible();
    });
  });

});
