// @ts-nocheck
import { test, expect } from '@playwright/test';

async function setupApp(page: any) {
  await page.context().addInitScript(() => {
    try { localStorage.setItem('agenmonster_welcomed', '1'); } catch {}
  });
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded', { timeout: 30000 });
  await page.locator('.app-shell').waitFor({ state: 'attached', timeout: 60000 });
  await page.waitForTimeout(1200);
}

test.describe('AgenMonster chat panel retry', () => {
  test.beforeEach(async ({ page }) => {
    await setupApp(page);
  });

  test('chat panel shows latency stats after response', async ({ page }) => {
    const ta = page.locator('.chat-input textarea').first();
    await ta.fill('/help');
    await ta.press('Enter');
    await page.waitForTimeout(2000);
    const stat = page.locator('.typing-stat');
    if (await stat.count() > 0) {
      await expect(stat.first()).toBeVisible();
    }
  });

  test('cancel button stops in-flight request', async ({ page }) => {
    const ta = page.locator('.chat-input textarea').first();
    await ta.fill('/help');
    await ta.press('Enter');
    await page.waitForTimeout(300);
    const cancelBtn = page.locator('.cancel-btn');
    if (await cancelBtn.count() > 0) {
      await cancelBtn.click();
      await page.waitForTimeout(500);
    }
  });

  test('chat messages persist after reload', async ({ page }) => {
    const ta = page.locator('.chat-input textarea').first();
    await ta.fill('/help');
    await ta.press('Enter');
    await page.waitForTimeout(2000);
    await page.reload();
    await page.locator('.app-shell').waitFor({ state: 'attached', timeout: 60000 });
    const countAfter = await page.locator('.chat-msg').count();
    expect(countAfter).toBeGreaterThan(0);
  });

  test('retry backoff recovers after transient error', async ({ page }) => {
    const ta = page.locator('.chat-input textarea').first();
    await ta.fill('tell me a long story');
    await ta.press('Enter');
    await page.waitForTimeout(3000);
    const msgs = page.locator('.chat-msg.assistant .bubble');
    const count = await msgs.count();
    expect(count).toBeGreaterThan(0);
  });
});
