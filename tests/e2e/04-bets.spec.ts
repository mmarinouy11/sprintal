import { test, expect } from '@playwright/test';
import { TEST_USER } from './helpers/auth';

test.describe('BET — Bets', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(`/${process.env.TEST_ORG_SLUG}/bets/board`);

    if (page.url().includes('/auth/login')) {
      await page.fill('input[type="email"]', TEST_USER.email);
      await page.fill('input[type="password"]', TEST_USER.password);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 15000 });
      await page.goto(`/${process.env.TEST_ORG_SLUG}/bets/board`);
    }

    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(500);
  });

  test('BET-07 — Columnas vacías no muestran "None"', async ({ page }) => {
    const noneText = page.locator('text="None"');
    await expect(noneText).not.toBeVisible();
  });

  test('BET-09 — Panel de detalle se abre al hacer clic en una bet', async ({ page }) => {
    const firstBet = page.locator('[data-testid="bet-card"]').or(
      page.locator('.bet-card')
    ).first();
    if (await firstBet.isVisible()) {
      await firstBet.click();
      const panel = page.locator('[data-testid="bet-detail-panel"]').or(
        page.locator('.bet-detail-panel')
      );
      await expect(panel).toBeVisible({ timeout: 5000 });
    }
  });

  test('BET-11 — Botón Editar tiene estilo de marca (no gris)', async ({ page }) => {
    const firstBet = page.locator('[data-testid="bet-card"]').first();
    if (await firstBet.isVisible({ timeout: 5000 })) {
      await firstBet.click();
      await expect(page.locator('[data-testid="bet-detail-panel"]')).toBeVisible({ timeout: 8000 });
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'test-results/bet-11-panel.png' });

      const editBtn = page.locator('[data-testid="bet-detail-panel"]').locator(
        'button:has-text("Editar"), button:has-text("Edit"), button[data-testid="edit-btn"], button[aria-label*="edit"], button[aria-label*="ditar"]'
      ).first();

      if (await editBtn.isVisible({ timeout: 3000 })) {
        const bgColor = await editBtn.evaluate(el => getComputedStyle(el).backgroundColor);
        expect(bgColor).not.toBe('rgb(156, 163, 175)');
        expect(bgColor).not.toBe('rgb(107, 114, 128)');
      } else {
        test.skip(true, 'Edit button not found — check bet-11-panel.png for actual button labels');
      }
    } else {
      test.skip(true, 'No bets in test org');
    }
  });

});
