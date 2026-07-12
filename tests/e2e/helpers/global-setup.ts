import { chromium, FullConfig } from '@playwright/test';
import { TEST_USER } from './auth';

async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0].use.baseURL || 'http://localhost:3000';
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto(`${baseURL}/auth/login`);
  await page.fill('input[type="email"]', TEST_USER.email);
  await page.fill('input[type="password"]', TEST_USER.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 15000 });

  const url = page.url();
  if (url.includes('/onboarding')) {
    await browser.close();
    throw new Error(
      `Test user landed on onboarding — complete the onboarding manually first.\nURL: ${url}`
    );
  }

  await page.context().storageState({ path: 'tests/e2e/.auth/user.json' });
  await browser.close();
}

export default globalSetup;
