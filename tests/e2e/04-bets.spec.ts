import { test, expect } from '@playwright/test';
import { TEST_USER } from './helpers/auth';

test.describe('BET — Bets', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(`/${TEST_USER.orgSlug}/bets/board`);
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
    // Navigate directly without re-logging in — session should still be active
    await page.goto(`/${TEST_USER.orgSlug}/bets/board`);
    await page.waitForURL(/\/bets\/board/, { timeout: 10000 });

    const firstBet = page.locator('[data-testid="bet-card"]').first();
    if (await firstBet.isVisible({ timeout: 5000 })) {
      await firstBet.click();
      const editBtn = page.locator('[data-testid="bet-detail-panel"] button:has-text("Editar")').or(
        page.locator('button:has-text("Editar")').first()
      );
      await expect(editBtn).toBeVisible({ timeout: 5000 });
      const bgColor = await editBtn.evaluate(el =>
        getComputedStyle(el).backgroundColor
      );
      // Brand color #5C6AC4 = rgb(92, 106, 196) — should not be gray
      expect(bgColor).not.toBe('rgb(156, 163, 175)');
      expect(bgColor).not.toBe('rgb(107, 114, 128)');
    } else {
      test.skip(true, 'No bets available in test org');
    }
  });

});
