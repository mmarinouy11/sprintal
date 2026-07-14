import { createClient } from '@supabase/supabase-js';
import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { loadE2EEnv } from './load-env';
import { TEST_USER } from './auth';

loadE2EEnv();

const TEST_DATA_FILE = path.join(__dirname, '../.auth/test-data.json');

export const TEST_BET_NAME = '[TEST] Playwright Test Bet';

export function getTestData(): { betId: string; orgSlug: string } | null {
  try {
    if (!fs.existsSync(TEST_DATA_FILE)) return null;
    return JSON.parse(fs.readFileSync(TEST_DATA_FILE, 'utf-8'));
  } catch {
    return null;
  }
}

export function getTestBetId(): string | null {
  return getTestData()?.betId ?? null;
}

/** Prefer the global-setup test bet card; fall back to any visible bet card. */
export async function resolveBetCard(page: Page): Promise<Locator> {
  const testBetCard = page.locator('[data-testid="bet-card"]').filter({
    hasText: TEST_BET_NAME,
  }).first();
  const anyBetCard = page.locator('[data-testid="bet-card"]').first();
  if (await testBetCard.isVisible({ timeout: 3000 }).catch(() => false)) {
    return testBetCard;
  }
  return anyBetCard;
}

/**
 * Open the bet detail panel.
 * Prefer deep-link /bets/board?bet=<id> (avoids Zustand board hydration races),
 * then fall back to clicking visible cards.
 */
export async function openTestBetPanel(page: Page): Promise<boolean> {
  const testData = getTestData();
  const orgSlug = testData?.orgSlug || process.env.TEST_ORG_SLUG || '';

  // Strategy 0: navigate directly to bet deep-link
  if (testData?.betId && orgSlug) {
    await page.goto(`/${orgSlug}/bets/board?bet=${testData.betId}`);
    await page.waitForTimeout(1000);
    if (page.url().includes('login')) {
      await page.fill('input[type="email"]', TEST_USER.email);
      await page.fill('input[type="password"]', TEST_USER.password);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 15000 });
      await page.goto(`/${orgSlug}/bets/board?bet=${testData.betId}`);
      await page.waitForTimeout(1000);
    }
    const panel = page.locator('[data-testid="bet-detail-panel"]');
    if (await panel.isVisible({ timeout: 8000 }).catch(() => false)) {
      return true;
    }
  }

  // Strategy 1: find by test bet name
  const testBetCard = page.locator('[data-testid="bet-card"]').filter({
    hasText: 'TEST',
  }).first();

  if (await testBetCard.isVisible({ timeout: 3000 }).catch(() => false)) {
    await testBetCard.click();
    await expect(page.locator('[data-testid="bet-detail-panel"]')).toBeVisible({ timeout: 8000 });
    return true;
  }

  // Strategy 2: find any bet card
  const anyCard = page.locator('[data-testid="bet-card"]').first();
  if (await anyCard.isVisible({ timeout: 3000 }).catch(() => false)) {
    await anyCard.click();
    await expect(page.locator('[data-testid="bet-detail-panel"]')).toBeVisible({ timeout: 8000 });
    return true;
  }

  // Strategy 3: reload and try again
  await page.reload();
  await page.waitForTimeout(3000);
  const cardAfterReload = page.locator('[data-testid="bet-card"]').first();
  if (await cardAfterReload.isVisible({ timeout: 5000 }).catch(() => false)) {
    await cardAfterReload.click();
    await expect(page.locator('[data-testid="bet-detail-panel"]')).toBeVisible({ timeout: 8000 });
    return true;
  }

  return false;
}

const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    'Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY in .env.test'
  );
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const ORG_SLUG = process.env.TEST_ORG_SLUG!;

export async function setupTestData() {
  console.log('[test-data] Setting up test data...');

  if (!ORG_SLUG) {
    throw new Error('TEST_ORG_SLUG is not set');
  }

  const { data: org } = await supabase
    .from('organizations')
    .select('id, slug')
    .eq('slug', ORG_SLUG)
    .maybeSingle();

  if (!org) throw new Error(`Test org '${ORG_SLUG}' not found`);

  const { data: sprint } = await supabase
    .from('sprints')
    .select('id')
    .eq('org_id', org.id)
    .eq('status', 'Active')
    .maybeSingle();

  if (!sprint) throw new Error(`No active sprint found in org '${ORG_SLUG}'`);

  const { data: bet, error: betError } = await supabase
    .from('bets')
    .insert({
      org_id: org.id,
      sprint_id: sprint.id,
      name: TEST_BET_NAME,
      status: 'Active',
      bet_type: 'strategic',
      signal: 'Unclear',
      is_draft: false,
      hypothesis: 'Si implementamos X, creemos que Y va a pasar, medido por Z',
      kill_criteria: 'Si el uso baja del 30% después de 6 semanas',
      scale_trigger: 'Si el NPS sube 20 puntos',
    })
    .select('id')
    .maybeSingle();

  if (betError) throw new Error(`Failed to create test bet: ${betError.message}`);
  if (!bet) throw new Error('Failed to create test bet: no row returned');

  const date = new Date().toISOString().split('T')[0];
  const { error: signalError } = await supabase
    .from('signal_checks')
    .insert({
      bet_id: bet.id,
      org_id: org.id,
      date,
      prev_signal: 'Unclear',
      signal: 'Strong',
      note: '[TEST] Playwright test signal check',
    });

  if (signalError) {
    console.warn('[test-data] Could not create signal check:', signalError.message);
  }

  const payload = {
    betId: bet.id,
    orgSlug: org.slug ?? ORG_SLUG,
  };

  fs.mkdirSync(path.dirname(TEST_DATA_FILE), { recursive: true });
  fs.writeFileSync(TEST_DATA_FILE, JSON.stringify(payload, null, 2));

  console.log('[test-data] Test bet created:', bet.id);

  return payload;
}

export async function teardownTestData(betId: string) {
  console.log('[test-data] Tearing down test data...');

  await supabase
    .from('signal_checks')
    .delete()
    .eq('bet_id', betId);

  const { error } = await supabase
    .from('bets')
    .delete()
    .eq('id', betId);

  if (error) {
    console.error('[test-data] Failed to delete test bet:', error.message);
  } else {
    console.log('[test-data] Test bet deleted:', betId);
  }
}
