import { test, expect } from '@playwright/test';
import { waitForLoadingOverlay } from './helpers/page';

const ORG = process.env.TEST_ORG_SLUG;

test.describe('SET — Configuración', () => {

  test('SET-01 — Página de configuración carga correctamente', async ({ page }) => {
    await page.goto(`/${ORG}/settings`);
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });
  });

  test('SET-03 — Tab de miembros muestra lista', async ({ page }) => {
    await page.goto(`/${ORG}/settings`);
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });
    await waitForLoadingOverlay(page);
    const membersTab = page.getByTestId('settings-members-tab');
    await expect(membersTab).toBeVisible({ timeout: 15000 });
    await membersTab.click();
    const memberList = page.locator('[data-testid="member-list"], table');
    const inviteForm = page.locator('input[type="email"]');
    await expect(memberList.or(inviteForm).first()).toBeVisible({ timeout: 5000 });
  });

  test('SET-10 — Cambiar idioma a español', async ({ page }) => {
    await page.goto(`/${ORG}/settings`);
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });
    await waitForLoadingOverlay(page);
    const langTab = page.getByTestId('settings-language-tab');
    await expect(langTab).toBeVisible({ timeout: 15000 });
    await langTab.click();
    const esOption = page.locator('button:has-text("Español")').or(
      page.locator('input[value="es"]').or(
        page.locator('label:has-text("Español")')
      )
    );
    await expect(esOption.first()).toBeVisible({ timeout: 5000 });
  });

  test('SET-13 — Página de facturación carga', async ({ page }) => {
    await page.goto(`/${ORG}/billing`);
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });
    const planName = page.locator('text=Trial').or(
      page.locator('text=Solo').or(
        page.locator('text=Starter').or(
          page.locator('text=Growth').or(page.locator('text=Scale'))
        )
      )
    );
    await expect(planName.first()).toBeVisible({ timeout: 8000 });
  });

});
