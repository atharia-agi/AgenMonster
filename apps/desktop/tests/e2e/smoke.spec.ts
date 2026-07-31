// @ts-nocheck
import { test, expect } from '@playwright/test';

test.describe('AgenMonster smoke', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => { try { localStorage.setItem('agenmonster_welcomed', '1'); } catch {} });
    await page.reload();
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    await page.locator('.app-shell').waitFor({ state: 'visible', timeout: 30000 });
  });

  test('loads home and shows the app shell', async ({ page }) => {
    await expect(page).toHaveTitle(/AgenMonster/);
  });

  test('has a top nav with tabs', async ({ page }) => {
    const nav = page.locator('.top-nav');
    await expect(nav).toBeVisible();
  });

  test('monster status panel renders', async ({ page }) => {
    const status = page.locator('.status-panel');
    await expect(status.first()).toBeVisible({ timeout: 15000 });
  });

  test('chat input is present and focused', async ({ page }) => {
    const input = page.locator('.chat-input textarea');
    await expect(input.first()).toBeVisible();
  });

  test('send a chat message and see it in the bubble list', async ({ page }) => {
    const input = page.locator('.chat-input textarea').first();
    await input.fill('/help');
    await input.press('Enter');
    const last = page.locator('.chat-msg.assistant .bubble').last();
    await expect(last).toContainText('Commands', { timeout: 5000 });
  });
});
