import { teardownTestData } from './test-data';
import { loadE2EEnv } from './load-env';
import fs from 'fs';
import path from 'path';

const TEST_DATA_FILE = path.join(__dirname, '../.auth/test-data.json');

async function globalTeardown() {
  loadE2EEnv();

  if (!fs.existsSync(TEST_DATA_FILE)) {
    console.log('[global-teardown] No test data file found, skipping teardown');
    return;
  }

  const testData = JSON.parse(fs.readFileSync(TEST_DATA_FILE, 'utf-8')) as { betId?: string };

  if (testData.betId) {
    await teardownTestData(testData.betId);
  }

  fs.unlinkSync(TEST_DATA_FILE);
  console.log('[global-teardown] Test data cleaned up ✓');
}

export default globalTeardown;
