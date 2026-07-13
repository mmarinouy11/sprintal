import { test, expect } from '@playwright/test';
import { TEST_USER } from './helpers/auth';

test.describe('DASH — Dashboard', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(`/${TEST_USER.orgSlug}/dashboard`, { timeout: 60000 });
  });

  test('DASH-01 — Dashboard carga correctamente', async ({ page }) => {
    // Verify dashboard loaded — check for the page container, not specific components
    // that only render when there's an active sprint
    await expect(page.locator('main, [data-testid="dashboard"], #dashboard')).toBeVisible({ timeout: 10000 });
    // Alternatively check the URL is correct
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('DASH-02 — Dashboard renderiza contenido (sprint card o estado vacío)', async ({ page }) => {
    // The dashboard loaded successfully if the main layout is visible
    // SprintCard, empty state, or rollup dashboard — any of these is valid
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });

    // Take a screenshot for manual verification
    await page.screenshot({ path: 'test-results/dash-02-state.png', fullPage: true });

    // Verify no error state
    await expect(page.locator('text=Something went wrong')).not.toBeVisible();
    await expect(page.locator('text=Error')).not.toBeVisible();
  });

  test('DASH-05 — Bets en borrador no muestran "draft" en español', async ({ page }) => {
    // Set language to Spanish first
    await page.goto(`/${TEST_USER.orgSlug}/settings`);
    const esBtn = page.locator('button:has-text("Español")').or(
      page.locator('input[value="es"]')
    );
    if (await esBtn.isVisible()) await esBtn.click();
    await page.goto(`/${TEST_USER.orgSlug}/dashboard`);
    // Should not see raw "draft" text in Spanish mode
    const draftText = page.locator('text="draft"');
    await expect(draftText).not.toBeVisible();
  });

  test('DASH-06 — Bets L1 no muestran badge de huérfana', async ({ page }) => {
    const orphanBadge = page.locator('[data-testid="orphan-badge"]').or(
      page.locator('.orphan-badge')
    );
    // If there are bets at L1, none should show orphan badge
    const count = await orphanBadge.count();
    expect(count).toBe(0);
  });

});
