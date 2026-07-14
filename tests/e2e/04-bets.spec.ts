import { test, expect } from '@playwright/test';
import { loginAndWaitForOrgContext } from './helpers/auth';
import { resolveBetCard } from './helpers/test-data';

test.describe('BET — Bets', () => {

  test.beforeEach(async ({ page }) => {
    await loginAndWaitForOrgContext(page);
    await page.goto(`/${process.env.TEST_ORG_SLUG}/bets/board`);
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(500);
    await page.waitForSelector('[data-testid="bet-card"], text=No bets yet', { timeout: 15000 }).catch(() => {});
  });

  test('BET-07 — Columnas vacías no muestran "None"', async ({ page }) => {
    const noneText = page.locator('text="None"');
    await expect(noneText).not.toBeVisible();
  });

  test('BET-09 — Panel de detalle se abre al hacer clic en una bet', async ({ page }) => {
    const betCard = (await resolveBetCard(page)).or(page.locator('.bet-card')).first();
    if (await betCard.isVisible()) {
      await betCard.click();
      const panel = page.locator('[data-testid="bet-detail-panel"]').or(
        page.locator('.bet-detail-panel')
      );
      await expect(panel).toBeVisible({ timeout: 5000 });
    }
  });

  test('BET-11 — Botón Editar tiene clase btn-primary (estilo de marca)', async ({ page }) => {
    const betCard = await resolveBetCard(page);
    if (!await betCard.isVisible({ timeout: 5000 })) {
      test.skip(true, 'No bets in test org');
      return;
    }
    await betCard.click();
    await expect(page.locator('[data-testid="bet-detail-panel"]')).toBeVisible({ timeout: 8000 });
    await page.waitForTimeout(1000);
    const editBtn = page.locator('[data-testid="bet-detail-panel"] button:has-text("Editar")').or(
      page.locator('[data-testid="bet-detail-panel"] button:has-text("Edit")')
    ).first();
    await expect(editBtn).toBeVisible({ timeout: 8000 });
    const className = await editBtn.getAttribute('class');
    expect(className).toContain('btn-primary');
  });

});
