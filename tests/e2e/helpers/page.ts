import { Page } from '@playwright/test';

/** Wait for the full-page loading overlay (LoadingScreen) to disappear. */
export async function waitForLoadingOverlay(page: Page) {
  await page.waitForSelector('.fixed.inset-0', { state: 'hidden', timeout: 10000 }).catch(() => {});
}
