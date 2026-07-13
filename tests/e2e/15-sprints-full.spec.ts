import { test, expect } from '@playwright/test';
import { loginAndWaitForOrgContext } from './helpers/auth';

const ORG = process.env.TEST_ORG_SLUG;

test.describe('SPR — Sprints completo', () => {

  test.beforeEach(async ({ page }) => {
    await loginAndWaitForOrgContext(page);
  });

  test('SPR-01 — Formulario de nuevo sprint accesible', async ({ page }) => {
    await page.goto(`/${ORG}/new/sprint`);
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('form')).toBeVisible({ timeout: 8000 });
  });

  test('SPR-02 — Duración recomendada visible en formulario', async ({ page }) => {
    await page.goto(`/${ORG}/new/sprint`);
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });
    // Should show duration recommendation
    const duration = page.locator('text=días').or(page.locator('text=days'));
    await expect(duration.first()).toBeVisible({ timeout: 8000 });
  });

  test('SPR-04 — Existe opción para activar sprint planificado (bug conocido)', async ({ page }) => {
    await page.goto(`/${ORG}/sprints`);
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });
    const plannedSprint = page.locator('text=Planificado').first();
    if (await plannedSprint.isVisible({ timeout: 3000 })) {
      // There SHOULD be an activate button — this test documents the known bug
      const activateBtn = page.locator('button:has-text("Activar")');
      await expect(activateBtn).toBeVisible({ timeout: 3000 });
    } else {
      test.skip(true, 'No planned sprints in test org');
    }
  });

  test('SPR-05 — Solo un sprint activo a la vez (bug conocido)', async ({ page }) => {
    await page.goto(`/${ORG}/sprints`);
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });
    const activeBadges = page.locator('text=Activo');
    const count = await activeBadges.count();
    expect(count).toBeLessThanOrEqual(1);
  });

  test('SPR — Lista de sprints carga correctamente', async ({ page }) => {
    await page.goto(`/${ORG}/sprints`);
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Something went wrong')).not.toBeVisible();
  });

});
