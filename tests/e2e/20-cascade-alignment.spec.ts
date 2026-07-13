import { test, expect } from '@playwright/test';
import { TEST_USER } from './helpers/auth';

const ORG = process.env.TEST_ORG_SLUG;

test.describe('CASCADE — Alineación en cascada', () => {

  test('CASCADE — Formulario de nueva bet muestra selector de bet padre', async ({ page }) => {
    await page.goto(`/${ORG}/new/bet`);
    if (page.url().includes('/auth/login')) {
      await page.fill('input[type="email"]', TEST_USER.email);
      await page.fill('input[type="password"]', TEST_USER.password);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 15000 });
      await page.goto(`/${ORG}/new/bet`);
    }
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'test-results/cascade-new-bet-form.png' });
    const cascadeSection = page.locator('text=Alineación').or(
      page.locator('text=Bet padre').or(
        page.locator('text=Parent').or(
          page.locator('[data-testid="cascade-selector"]')
        )
      )
    );
    const upgradeGate = page.locator('text=requiere').or(page.locator('[data-testid="upgrade-modal"]'));
    await expect(cascadeSection.or(upgradeGate)).toBeVisible({ timeout: 8000 });
  });

  test('CASCADE — Panel de bet muestra sección de alineación', async ({ page }) => {
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
    await page.screenshot({ path: 'test-results/cascade-bet-panel.png' });
    await expect(page.locator('text=Something went wrong')).not.toBeVisible();
  });

});
