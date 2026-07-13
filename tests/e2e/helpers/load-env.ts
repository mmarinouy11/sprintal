import fs from 'fs';
import path from 'path';

/** Load tests/e2e/.env.test (and repo-root .env.test) into process.env for global setup/teardown. */
export function loadE2EEnv() {
  const envPath = path.join(__dirname, '../../../.env.test');
  if (!fs.existsSync(envPath)) return;
    for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim();
      if (key && process.env[key] === undefined) {
        process.env[key] = val;
      }
    }
}
