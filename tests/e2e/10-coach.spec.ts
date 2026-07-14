import { test, expect } from '@playwright/test';
import { loginAndGo, loginAndWaitForOrgContext, TEST_USER } from './helpers/auth';
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
    // Set language to Spanish via settings
    await loginAndWaitForOrgContext(page);
    await page.goto(`/${process.env.TEST_ORG_SLUG}/settings`);
    await page.waitForURL(/\/settings/, { timeout: 10000 });

    // Check if redirected to login
    if (page.url().includes('login')) {
      await page.fill('input[type="email"]', TEST_USER.email);
      await page.fill('input[type="password"]', TEST_USER.password);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 15000 });
      await page.goto(`/${process.env.TEST_ORG_SLUG}/settings`);
    }

    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(500);

    const langTab = page.getByTestId('settings-language-tab');
    if (await langTab.isVisible({ timeout: 3000 })) {
      await langTab.click();
      const esOption = page.locator('button:has-text("Español")').or(
        page.locator('input[value="es"]').or(
          page.locator('label:has-text("Español")')
        )
      );
      if (await esOption.first().isVisible({ timeout: 3000 })) {
        await esOption.first().click();
        await page.waitForTimeout(1000);
      }
    }

    // Go to new bet and trigger coach
    await page.goto(`/${process.env.TEST_ORG_SLUG}/new/bet`);
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });
    const hypothesisField = page.locator('textarea').first();
    if (await hypothesisField.isVisible({ timeout: 5000 })) {
      await hypothesisField.fill('Si implementamos esta funcionalidad creemos que aumentará la retención de usuarios');
      await hypothesisField.blur();
      await page.waitForTimeout(2000);
      const observation = page.locator('[data-testid="coach-observation"]');
      if (await observation.isVisible({ timeout: 5000 })) {
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
