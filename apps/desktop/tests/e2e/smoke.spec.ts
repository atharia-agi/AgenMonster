// @ts-nocheck
import { test, expect } from '@playwright/test';

test.describe('AgenMonster smoke', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('loads home and shows the app shell', async ({ page }) => {
    await expect(page).toHaveTitle(/AgenMonster/);
  });

  test('has a top nav with tabs', async ({ page }) => {
    const nav = page.locator('.top-nav');
    await expect(nav).toBeVisible();
  });

  test('monster status panel renders', async ({ page }) => {
    const status = page.locator('.status-panel, .ribbon-header');
    await expect(status.first()).toBeVisible();
  });

  test('chat input is present and focused', async ({ page }) => {
    const input = page.locator('.chat-input textarea, textarea[aria-label]');
    await expect(input.first()).toBeVisible();
  });

  test('send a chat message and see it in the bubble list', async ({ page }) => {
    const input = page.locator('.chat-input textarea, textarea').first();
    await input.fill('/help');
    await input.press('Enter');
    await page.waitForTimeout(300);
    const last = page.locator('.chat-msg.assistant .msg-bubble').last();
    await expect(last).toContainText('Commands');
  });
});
