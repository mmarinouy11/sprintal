import { test, expect } from '@playwright/test';
import { loginAndGo } from './helpers/auth';

const ORG = process.env.TEST_ORG_SLUG;

test.describe('NOT — Notificaciones', () => {

  test('NOT-01 — Campanita visible en TopBar', async ({ page }) => {
    await loginAndGo(page, `/${ORG}/dashboard`);
    await page.waitForTimeout(500);
    const bell = page.locator('button[aria-label="notifications"]');
    await expect(bell).toBeVisible({ timeout: 15000 });
  });

  test('NOT-02 — Panel de notificaciones se abre al hacer clic', async ({ page }) => {
    await loginAndGo(page, `/${ORG}/dashboard`);
    await page.waitForTimeout(500);
    const bell = page.locator('button[aria-label="notifications"]');
    await expect(bell).toBeVisible({ timeout: 15000 });
    await bell.dispatchEvent('click');
    const panel = page.locator('[data-testid="notification-panel"]');
    await expect(panel).toBeVisible({ timeout: 8000 });
  });

});
