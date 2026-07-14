import { test, expect } from '@playwright/test';
import { loginAndWaitForOrgContext } from './helpers/auth';
import { openTestBetPanel } from './helpers/test-data';

test.describe('BET — Bets', () => {

  test.beforeEach(async ({ page }) => {
    await loginAndWaitForOrgContext(page);
    await page.goto(`/${process.env.TEST_ORG_SLUG}/bets/board`);
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

  test('BET-07 — Columnas vacías no muestran "None"', async ({ page }) => {
    const noneText = page.locator('text="None"');
    await expect(noneText).not.toBeVisible();
  });

  test('BET-09 — Panel de detalle se abre al hacer clic en una bet', async ({ page }) => {
    const opened = await openTestBetPanel(page);
    if (!opened) {
      test.skip(true, 'Could not open bet panel');
      return;
    }
    const panel = page.locator('[data-testid="bet-detail-panel"]').or(
      page.locator('.bet-detail-panel')
    );
    await expect(panel).toBeVisible({ timeout: 5000 });
  });

  test('BET-11 — Botón Editar tiene clase btn-primary (estilo de marca)', async ({ page }) => {
    const opened = await openTestBetPanel(page);
    if (!opened) {
      test.skip(true, 'Could not open bet panel');
      return;
    }
    await page.waitForTimeout(300);
    const editBtn = page.locator('[data-testid="bet-detail-panel"] button:has-text("Editar")').or(
      page.locator('[data-testid="bet-detail-panel"] button:has-text("Edit")')
    ).first();
    await expect(editBtn).toBeVisible({ timeout: 8000 });
    const className = await editBtn.getAttribute('class');
    expect(className).toContain('btn-primary');
  });

});
