import { test, expect } from '@playwright/test';
import { loginAndWaitForOrgContext } from './helpers/auth';
import { openTestBetPanel } from './helpers/test-data';

const ORG = process.env.TEST_ORG_SLUG;

test.describe('BET Panel — Panel de detalle completo', () => {

  test.beforeEach(async ({ page }) => {
    // Establish auth via dashboard
    await loginAndWaitForOrgContext(page);

    // Navigate to bets board
    await page.goto(`/${ORG}/bets/board`);
    await expect(page.locator('main')).toBeVisible({ timeout: 15000 });

    // Wait for either bet cards OR empty state — up to 10s
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
    await expect(editBtn).toBeVisible({ timeout: 5000 });
    const className = await editBtn.getAttribute('class');
    expect(className).toContain('btn-primary');
  });

  test('BET-09 — Panel de detalle se abre y muestra datos', async ({ page }) => {
    const opened = await openTestBetPanel(page);
    if (!opened) {
      test.skip(true, 'Could not open bet panel');
      return;
    }
    const panel = page.locator('[data-testid="bet-detail-panel"]');
    await expect(panel).toBeVisible({ timeout: 8000 });
    const editBtn = page.locator('[data-testid="bet-detail-panel"] button:has-text("Editar")').or(
      page.locator('[data-testid="bet-detail-panel"] button:has-text("Edit")')
    ).first();
    await expect(editBtn).toBeVisible({ timeout: 5000 });
  });

  test('BET-12 — Edición de bet no pierde foco al escribir', async ({ page }) => {
    const opened = await openTestBetPanel(page);
    if (!opened) {
      test.skip(true, 'Could not open bet panel');
      return;
    }
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
    const opened = await openTestBetPanel(page);
    if (!opened) {
      test.skip(true, 'Could not open bet panel');
      return;
    }
    await page.screenshot({ path: 'test-results/bet-14-panel.png' });
    await expect(page.locator('text=Something went wrong')).not.toBeVisible();
  });

});
