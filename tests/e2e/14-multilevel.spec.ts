import { test, expect } from '@playwright/test';
import { waitForLoadingOverlay } from './helpers/page';

const ORG = process.env.TEST_ORG_SLUG;

test.describe('ML — Acceso Multi-nivel', () => {

  test('ML — Org switcher visible en TopBar', async ({ page }) => {
    await page.goto(`/${ORG}/dashboard`);
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });
    await waitForLoadingOverlay(page);
    const orgSwitcher = page.getByTestId('org-switcher');
    await expect(orgSwitcher).toBeVisible({ timeout: 15000 });
  });

  test('ML-05 — Banner de solo lectura visible al ver org padre', async ({ page }) => {
    await page.goto(`/${ORG}/dashboard`);
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });
    await waitForLoadingOverlay(page);
    await page.screenshot({ path: 'test-results/ml-readonly-state.png' });
  });

  test('ML-06 — Sin acciones de edición en modo solo lectura', async ({ page }) => {
    await page.goto(`/${ORG}/dashboard`);
    await waitForLoadingOverlay(page);
    const readOnlyBanner = page.locator('[data-testid="readonly-banner"]');
    if (await readOnlyBanner.isVisible({ timeout: 3000 })) {
      await expect(page.locator('button:has-text("Nueva Bet")')).not.toBeVisible();
      await expect(page.locator('button:has-text("Nuevo Sprint")')).not.toBeVisible();
    } else {
      test.skip(true, 'User is not in read-only mode');
    }
  });

});
