import { chromium, FullConfig } from '@playwright/test';
import { TEST_USER } from './auth';
import { setupTestData } from './test-data';
import { loadE2EEnv } from './load-env';
import fs from 'fs';
import path from 'path';

const AUTH_FILE = path.join(__dirname, '../.auth/user.json');
const TEST_DATA_FILE = path.join(__dirname, '../.auth/test-data.json');

async function globalSetup(config: FullConfig) {
  loadE2EEnv();

  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });

  // 1. Auth setup
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const baseURL = config.projects[0].use.baseURL!;

  await page.goto(`${baseURL}/auth/login`);
  await page.fill('input[type="email"]', TEST_USER.email);
  await page.fill('input[type="password"]', TEST_USER.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 15000 });

  const url = page.url();
  if (url.includes('/onboarding')) {
    await browser.close();
    throw new Error(`Test user landed on onboarding — complete the onboarding manually first.\nURL: ${url}`);
  }

  await page.context().storageState({ path: AUTH_FILE });
  await browser.close();

  // Patch cookies
  const storage = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8'));
  storage.cookies = storage.cookies.map((cookie: { secure?: boolean; sameSite?: string }) => ({
    ...cookie,
    secure: true,
    sameSite: 'Lax',
  }));
  fs.writeFileSync(AUTH_FILE, JSON.stringify(storage, null, 2));
  console.log('[global-setup] Auth state saved and patched ✓');

  // 2. Test data setup
  const testData = await setupTestData();
  fs.writeFileSync(TEST_DATA_FILE, JSON.stringify(testData, null, 2));
  console.log('[global-setup] Test data created ✓');
}

export default globalSetup;
