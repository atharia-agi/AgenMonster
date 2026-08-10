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

test.describe('AgenMonster smoke', () => {
  test.beforeEach(async ({ page }) => {
    await setupApp(page);
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
    await expect(status.first()).toBeVisible({ timeout: 30000 });
  });

  test('chat input is present', async ({ page }) => {
    const input = page.locator('.chat-input textarea');
    await expect(input.first()).toBeVisible({ timeout: 30000 });
  });

  test('send a chat message and see it in the bubble list', async ({ page }) => {
    await page.evaluate(() => {
      const ta = document.querySelector('.chat-input textarea') as HTMLTextAreaElement | null;
      if (ta) {
        ta.value = '/help';
        ta.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await page.waitForTimeout(300);
    await page.evaluate(() => {
      const btn = document.querySelector('.send-btn') as HTMLElement | null;
      if (btn) btn.click();
    });
    await page.waitForTimeout(500);
    const last = page.locator('.chat-msg.assistant .bubble').last();
    await expect(last).toContainText('Commands', { timeout: 20000 });
  });
});
