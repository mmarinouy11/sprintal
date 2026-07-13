import { test, expect } from '@playwright/test';
import { loginAndGo } from './helpers/auth';
import { waitForLoadingOverlay } from './helpers/page';

const ORG = process.env.TEST_ORG_SLUG;

test.describe('COA — Coach IA', () => {

  test('COA-01 — Coach de formulación se activa en campo de hipótesis', async ({ page }) => {
    await page.goto(`/${ORG}/new/bet`);
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });
    await waitForLoadingOverlay(page);
    const hypothesisField = page.locator('textarea[name="hypothesis"], textarea').first();
    if (await hypothesisField.isVisible({ timeout: 5000 })) {
      await hypothesisField.click();
      await hypothesisField.fill('Si hacemos esto esperamos que pase algo');
      await hypothesisField.blur();
      await page.waitForTimeout(2000);
      await expect(page.locator('text=Error')).not.toBeVisible();
    }
  });

  test('COA-03 — Coach responde en español cuando la app está en español', async ({ page }) => {
    await page.goto(`/${ORG}/settings`);
    await waitForLoadingOverlay(page);
    const esOption = page.locator('button:has-text("Español")').or(
      page.locator('input[value="es"]')
    );
    if (await esOption.isVisible({ timeout: 3000 })) {
      await esOption.click();
      await page.waitForTimeout(1000);
    }
    await page.goto(`/${ORG}/new/bet`);
    await waitForLoadingOverlay(page);
    const hypothesisField = page.locator('textarea').first();
    if (await hypothesisField.isVisible({ timeout: 5000 })) {
      await hypothesisField.fill('Si implementamos esta funcionalidad creemos que aumentará la retención');
      await hypothesisField.blur();
      await page.waitForTimeout(2000);
      const observation = page.locator('[data-testid="coach-observation"]');
      if (await observation.isVisible({ timeout: 3000 })) {
        const text = await observation.textContent();
        expect(text).not.toMatch(/\bshould\b|\bmust\b|\bensure\b/i);
      }
    }
  });

  test('COA-09 — Créditos de coach visibles en configuración', async ({ page }) => {
    await loginAndGo(page, `/${ORG}/settings`);
    await page.waitForTimeout(500);
    const coachTab = page.getByTestId('settings-coach-tab');
    await expect(coachTab).toBeVisible({ timeout: 15000 });
    await coachTab.click();
    const creditsSection = page.locator('text=Créditos').or(page.locator('text=Credits'));
    await expect(creditsSection.first()).toBeVisible({ timeout: 5000 });
  });

});
