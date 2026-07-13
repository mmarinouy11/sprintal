import { Page } from '@playwright/test';

export async function waitForLoadingOverlay(page: Page, timeout = 5000) {
  // Wait for any fixed overlay/spinner to disappear — but don't fail if it's not there
  try {
    await page.waitForSelector(
      '.fixed.inset-0, [data-testid="loading-overlay"], [role="progressbar"]',
      { state: 'hidden', timeout }
    );
  } catch {
    // Overlay not found or already gone — continue
  }
}
