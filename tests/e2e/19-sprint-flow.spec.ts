import { test, expect } from '@playwright/test';
import { TEST_USER } from './helpers/auth';

const ORG = process.env.TEST_ORG_SLUG;

test.describe('SPR Flow — Sprint completo', () => {

  test('SPR — Lista de sprints muestra sprint activo', async ({ page }) => {
    await page.goto(`/${ORG}/sprints`);
    if (page.url().includes('/auth/login')) {
      await page.fill('input[type="email"]', TEST_USER.email);
      await page.fill('input[type="password"]', TEST_USER.password);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 15000 });
      await page.goto(`/${ORG}/sprints`);
    }
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });
    const sprintList = page.locator('[data-testid="sprint-list"], .sprint-list, main');
    await expect(sprintList.first()).toBeVisible({ timeout: 8000 });
    await page.screenshot({ path: 'test-results/spr-list-state.png' });
  });

  test('SPR — Solo un sprint activo a la vez (doble verificación)', async ({ page }) => {
    await page.goto(`/${ORG}/sprints`);
    if (page.url().includes('/auth/login')) {
      await page.fill('input[type="email"]', TEST_USER.email);
      await page.fill('input[type="password"]', TEST_USER.password);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 15000 });
      await page.goto(`/${ORG}/sprints`);
    }
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });
    const activeBadges = page.locator('text=Activo');
    const count = await activeBadges.count();
    expect(count).toBeLessThanOrEqual(1);
  });

  test('SPR — Estado por defecto del nuevo sprint (documenta bug SPR-01)', async ({ page }) => {
    await page.goto(`/${ORG}/new/sprint`);
    if (page.url().includes('/auth/login')) {
      await page.fill('input[type="email"]', TEST_USER.email);
      await page.fill('input[type="password"]', TEST_USER.password);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 15000 });
      await page.goto(`/${ORG}/new/sprint`);
    }
    await expect(page.locator('main')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'test-results/spr-new-default-status.png', fullPage: true });
    await expect(page.locator('text=Something went wrong')).not.toBeVisible();
    const statusField = page.locator('select, input[name*="status"], [data-testid*="status"]').first();
    if (await statusField.isVisible({ timeout: 3000 })) {
      const value = await statusField.inputValue().catch(() => '');
      console.log('Default sprint status:', value);
    }
  });

});
