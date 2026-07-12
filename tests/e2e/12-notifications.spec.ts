import { test, expect } from '@playwright/test';
import { waitForLoadingOverlay } from './helpers/page';

const ORG = process.env.TEST_ORG_SLUG;

test.describe('NOT — Notificaciones', () => {

  test('NOT-01 — Campanita visible en TopBar', async ({ page }) => {
    await page.goto(`/${ORG}/dashboard`);
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });
    await waitForLoadingOverlay(page);
    const bell = page.locator('button[aria-label="notifications"]');
    await expect(bell).toBeVisible({ timeout: 8000 });
  });

  test('NOT-02 — Panel de notificaciones se abre al hacer clic', async ({ page }) => {
    await page.goto(`/${ORG}/dashboard`);
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });
    await waitForLoadingOverlay(page);
    const bell = page.locator('button[aria-label="notifications"]');
    await bell.click();
    const panel = page.locator('[data-testid="notification-panel"]');
    await expect(panel).toBeVisible({ timeout: 5000 });
  });

});
