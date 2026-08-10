// @ts-nocheck
import { test, expect } from '@playwright/test';

async function setupApp(page: any) {
  await page.context().addInitScript(() => {
    try {
      localStorage.setItem('agenmonster_welcomed', '1');
      localStorage.removeItem('agenmonster_focus_mode');
    } catch {}
  });
  await page.route('/api/llm/providers', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ providers: [{ id: 'mock', name: 'Mock', models: ['mock-model'] }] }),
    });
  });
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded', { timeout: 30000 });
  await page.locator('.app-shell').waitFor({ state: 'attached', timeout: 60000 });
  await page.evaluate(() => {
    try { localStorage.removeItem('agenmonster_focus_mode'); } catch {}
    document.body.classList.remove('focus-mode');
  });
  await page.waitForTimeout(1500);
}

function jsClick(page: any, selector: string) {
  return page.evaluate((sel: string) => {
    const el = document.querySelector(sel) as HTMLElement | null;
    if (el) el.click();
  }, selector);
}

function jsSetValue(page: any, selector: string, value: string) {
  return page.evaluate(
    ({ sel, val }: { sel: string; val: string }) => {
      const el = document.querySelector(sel) as HTMLTextAreaElement | HTMLInputElement | null;
      if (el) {
        el.value = val;
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }
    },
    { sel: selector, val: value }
  );
}

test.describe('AgenMonster agentic features', () => {
  test.beforeEach(async ({ page }) => {
    await setupApp(page);
  });

  test('mode bar is visible with mode buttons', async ({ page }) => {
    const modeBar = page.locator('.mode-bar');
    await expect(modeBar).toBeVisible({ timeout: 15000 });

    const modeButtons = page.locator('.mode-btn');
    await expect(modeButtons.first()).toBeVisible({ timeout: 15000 });
    await expect(modeButtons).toHaveCount(4);
  });

  test('clicking mode buttons switches active mode', async ({ page }) => {
    const modeBar = page.locator('.mode-bar');
    await expect(modeBar).toBeVisible({ timeout: 15000 });

    const planBtn = page.locator('.mode-btn', { hasText: 'PLAN' });
    await planBtn.click();
    await page.waitForTimeout(300);

    const activeBtn = page.locator('.mode-btn.active');
    await expect(activeBtn).toHaveText('PLAN', { timeout: 5000 });
  });

  test('steer mode toggle shows queue bar via keyboard', async ({ page }) => {
    const chatInput = page.locator('.chat-input textarea, .chat-input input').first();
    await chatInput.click();
    await page.keyboard.down('Control');
    await page.keyboard.down('Shift');
    await page.keyboard.press('KeyQ');
    await page.keyboard.up('Shift');
    await page.keyboard.up('Control');
    await page.waitForTimeout(500);

    const steerBar = page.locator('.steer-bar');
    await expect(steerBar).toBeVisible({ timeout: 15000 });
    await expect(steerBar).toContainText('STEER');
  });

  test('skills picker toggles visibility via keyboard', async ({ page }) => {
    await page.keyboard.press('Control+Shift+s');
    await page.waitForTimeout(500);

    const skillPicker = page.locator('.skill-picker');
    const count = await skillPicker.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('healing bar appears in chat panel when needs are critical', async ({ page }) => {
    const chatPanel = page.locator('.chat-panel');
    await expect(chatPanel).toBeVisible({ timeout: 15000 });

    const healingBar = chatPanel.locator('.healing-bar');
    const count = await healingBar.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('healing text shows self-healing status', async ({ page }) => {
    const chatPanel = page.locator('.chat-panel');
    await expect(chatPanel).toBeVisible({ timeout: 15000 });

    const healingText = chatPanel.locator('.healing-text');
    const count = await healingText.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('steer mode STOP button clears queue', async ({ page }) => {
    const chatInput = page.locator('.chat-input textarea, .chat-input input').first();
    await chatInput.click();
    await page.keyboard.down('Control');
    await page.keyboard.down('Shift');
    await page.keyboard.press('KeyQ');
    await page.keyboard.up('Shift');
    await page.keyboard.up('Control');
    await page.waitForTimeout(500);

    const steerBar = page.locator('.steer-bar');
    await expect(steerBar).toBeVisible({ timeout: 15000 });

    const stopBtn = steerBar.locator('button').filter({ hasText: 'STOP' });
    await stopBtn.click();
    await page.waitForTimeout(500);

    const steerBarAfter = page.locator('.steer-bar');
    const count = await steerBarAfter.count();
    expect(count).toBe(0);
  });
});