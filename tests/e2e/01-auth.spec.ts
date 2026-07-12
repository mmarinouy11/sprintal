import { test, expect } from '@playwright/test';
import { TEST_USER } from './helpers/auth';

test.describe('AUTH — Autenticación', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('AUTH-01 — Login con credenciales válidas', async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('AUTH-02 — Login con contraseña incorrecta muestra error', async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/auth/login');
    // Error message should be visible
    const errorMsg = page.locator('[data-testid="auth-error"], .error-message, [role="alert"]');
    await expect(errorMsg).toBeVisible({ timeout: 5000 });
  });

  test('AUTH-05 — Landing page visible sin sesión', async ({ page }) => {
    await page.goto('/');
    await expect(page).not.toHaveURL('/auth/login');
    // Use first() to avoid strict mode violation (tagline appears in h1 and footer)
    await expect(page.locator('h1:has-text("Strategy that learns")').first()).toBeVisible();
  });
});

test.describe('AUTH — Autenticación (con sesión)', () => {
  test('AUTH-12 — Cerrar sesión', async ({ page }) => {
    await page.goto(`/${TEST_USER.orgSlug}/dashboard`);
    const logoutBtn = page.locator('[data-testid="logout-btn"]').or(
      page.locator('button:has-text("Cerrar sesión")').or(
        page.locator('button:has-text("Sign out")')
      )
    );
    await logoutBtn.click();
    await expect(page).toHaveURL('/auth/login');
  });
});
