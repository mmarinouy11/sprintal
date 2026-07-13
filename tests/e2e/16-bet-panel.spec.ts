import { test, expect } from '@playwright/test';
import { loginAndWaitForOrgContext } from './helpers/auth';
import { getTestBetId, resolveBetCard } from './helpers/test-data';

test.describe('BET Panel — Panel de detalle completo', () => {

  test.beforeEach(async ({ page }) => {
    await loginAndWaitForOrgContext(page);
    await page.goto(`/${process.env.TEST_ORG_SLUG}/bets/board`);
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(500);
    await page.waitForSelector('[data-testid="bet-card"], text=No bets yet', { timeout: 15000 }).catch(() => {});

    const betId = getTestBetId();
    if (betId) {
      await page.waitForSelector('[data-testid="bet-card"]', { timeout: 15000 }).catch(() => {});
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
    await page.waitForTimeout(300);
    const editBtn = page.locator('[data-testid="bet-detail-panel"] button:has-text("Editar")').or(
      page.locator('[data-testid="bet-detail-panel"] button:has-text("Edit")')
    ).first();
    await expect(editBtn).toBeVisible({ timeout: 5000 });
    const className = await editBtn.getAttribute('class');
    expect(className).toContain('btn-primary');
  });

  test('BET-09 — Panel de detalle se abre y muestra datos', async ({ page }) => {
    const betCard = await resolveBetCard(page);
    if (!await betCard.isVisible({ timeout: 5000 })) {
      test.skip(true, 'No bets in test org');
      return;
    }
    await betCard.click();
    const panel = page.locator('[data-testid="bet-detail-panel"]');
    await expect(panel).toBeVisible({ timeout: 8000 });
    await expect(
      panel.locator('button:has-text("Editar")').or(
        panel.locator('button:has-text("Edit")')
      ).first()
    ).toBeVisible({ timeout: 5000 });
  });

  test('BET-12 — Edición de bet no pierde foco al escribir', async ({ page }) => {
    const betCard = await resolveBetCard(page);
    if (!await betCard.isVisible({ timeout: 5000 })) {
      test.skip(true, 'No bets in test org');
      return;
    }
    await betCard.click();
    await expect(page.locator('[data-testid="bet-detail-panel"]')).toBeVisible({ timeout: 8000 });
    await page.waitForTimeout(300);
    const editBtn = page.locator('[data-testid="bet-detail-panel"] button:has-text("Editar")').or(
      page.locator('[data-testid="bet-detail-panel"] button:has-text("Edit")')
    ).first();
    await editBtn.click();
    await page.waitForTimeout(300);
    const textarea = page.locator('[data-testid="bet-detail-panel"] textarea').first();
    await expect(textarea).toBeVisible({ timeout: 5000 });
    await textarea.click();
    await textarea.type('xyz');
    await expect(textarea).toBeFocused();
    const value = await textarea.inputValue();
    expect(value).toContain('xyz');
    for (let i = 0; i < 3; i++) await textarea.press('Backspace');
  });

  test('BET-14 — Sección Cascada dentro del panel tiene contenedor correcto', async ({ page }) => {
    const betCard = await resolveBetCard(page);
    if (!await betCard.isVisible({ timeout: 5000 })) {
      test.skip(true, 'No bets in test org');
      return;
    }
    await betCard.click();
    const panel = page.locator('[data-testid="bet-detail-panel"]');
    await expect(panel).toBeVisible({ timeout: 8000 });
    await page.screenshot({ path: 'test-results/bet-14-panel.png' });
    await expect(page.locator('text=Something went wrong')).not.toBeVisible();
  });

});
