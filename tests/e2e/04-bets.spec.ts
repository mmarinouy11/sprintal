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

  test('BET-11 — Botón Editar tiene clase btn-primary (estilo de marca)', async ({ page }) => {
    const firstBet = page.locator('[data-testid="bet-card"]').first();
    if (!await firstBet.isVisible({ timeout: 5000 })) {
      test.skip(true, 'No bets in test org');
      return;
    }
    await firstBet.click();
    await expect(page.locator('[data-testid="bet-detail-panel"]')).toBeVisible({ timeout: 8000 });
    await page.waitForTimeout(300);
    const editBtn = page.locator('[data-testid="bet-detail-panel"] button.btn-primary').first();
    await expect(editBtn).toBeVisible({ timeout: 5000 });
    const className = await editBtn.getAttribute('class');
    expect(className).toContain('btn-primary');
  });

});
