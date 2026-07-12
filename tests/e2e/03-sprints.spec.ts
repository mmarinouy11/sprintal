import { test, expect } from '@playwright/test';
import { TEST_USER } from './helpers/auth';

test.describe('SPR — Sprints', () => {

  test('SPR-04 — No hay opción para activar sprint planificado (bug conocido)', async ({ page }) => {
    await page.goto(`/${TEST_USER.orgSlug}/sprints`);
    // Look for a sprint in Planned status
    const plannedSprint = page.locator('text=Planificado').first();
    if (await plannedSprint.isVisible()) {
      // There should be an "Activate" button — currently failing
      const activateBtn = page.locator('button:has-text("Activar")');
      await expect(activateBtn).toBeVisible({ timeout: 3000 });
    }
  });

  test('SPR-05 — No se permiten dos sprints activos (bug conocido)', async ({ page }) => {
    await page.goto(`/${TEST_USER.orgSlug}/sprints`);
    const activeSprints = page.locator('text=Activo');
    const count = await activeSprints.count();
    expect(count).toBeLessThanOrEqual(1);
  });

});
