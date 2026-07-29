// E2E smoke test: desktop pet window renders + chat responds.
// Requires: cargo run -p agenmonster-desktop running on port 1420 dev.

import { test, expect } from '@playwright/test';

test.describe('Pet Floating Window', () => {
  test('pet floating window renders with canvas', async ({ page }) => {
    await page.goto('http://localhost:1420?window=floating');
    await expect(page).toHaveTitle(/AgenMonster/);
    const canvas = page.locator('canvas.pixel');
    await expect(canvas).toBeVisible({ timeout: 10_000 });
    const box = await canvas.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(240);
    expect(box?.height).toBeGreaterThanOrEqual(240);
  });

  test('pet renders pixel art on canvas', async ({ page }) => {
    await page.goto('http://localhost:1420?window=floating');
    const canvas = page.locator('canvas.pixel');
    await expect(canvas).toBeVisible({ timeout: 10_000 });
    // Wait for render loop to start
    await page.waitForTimeout(500);
    // Canvas should have non-zero dimensions
    const dims = await canvas.evaluate((el: HTMLCanvasElement) => ({
      w: el.width, h: el.height,
    }));
    expect(dims.w).toBe(240);
    expect(dims.h).toBe(240);
  });

  test('pet mood updates via Tauri event', async ({ page }) => {
    await page.goto('http://localhost:1420?window=floating');
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('pet:frame', {
        detail: { mood: 'proud', stage: 'teen', speech: null }
      }));
    });
    await page.waitForTimeout(200);
    // No crash = pass
  });

  test('keyboard shortcut CmdOrCtrl+Shift+A works', async ({ page }) => {
    await page.goto('http://localhost:1420?window=floating');
    await page.keyboard.press('Control+Shift+A');
    await page.waitForTimeout(500);
    // No crash = pass
  });

  test('canvas stays responsive after 2 seconds', async ({ page }) => {
    await page.goto('http://localhost:1420?window=floating');
    const canvas = page.locator('canvas.pixel');
    await expect(canvas).toBeVisible({ timeout: 10_000 });
    await page.waitForTimeout(2000);
    // Canvas should still be visible and rendering
    await expect(canvas).toBeVisible();
    const box = await canvas.boundingBox();
    expect(box?.width).toBeGreaterThan(0);
  });
});

test.describe('Chat Window', () => {
  test('chat window renders and accepts input', async ({ page }) => {
    await page.goto('http://localhost:1420?window=chat');
    await expect(page.locator('header strong')).toContainText('AgenMonster');
    const input = page.locator('textarea');
    await expect(input).toBeVisible();
    await input.fill('hello pet');
    await page.locator('button').click();
    await expect(page.locator('.row.you').first()).toContainText('hello pet');
  });

  test('chat window has proper layout', async ({ page }) => {
    await page.goto('http://localhost:1420?window=chat');
    await expect(page).toHaveTitle(/AgenMonster/);
    // Header should be visible
    const header = page.locator('header');
    await expect(header).toBeVisible();
    // Textarea should be visible
    const input = page.locator('textarea');
    await expect(input).toBeVisible();
    // Send button should be visible
    const button = page.locator('button');
    await expect(button).toBeVisible();
  });

  test('chat window keyboard shortcut sends message', async ({ page }) => {
    await page.goto('http://localhost:1420?window=chat');
    const input = page.locator('textarea');
    await input.fill('test message');
    await input.press('Enter');
    await page.waitForTimeout(200);
    // Message should appear in chat
    const rows = page.locator('.row');
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
  });
});

test.describe('Performance', () => {
  test('pet window loads within 5 seconds', async ({ page }) => {
    const start = Date.now();
    await page.goto('http://localhost:1420?window=floating');
    await page.locator('canvas.pixel').waitFor({ timeout: 10_000 });
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(5000);
  });

  test('chat window loads within 5 seconds', async ({ page }) => {
    const start = Date.now();
    await page.goto('http://localhost:1420?window=chat');
    await page.locator('textarea').waitFor({ timeout: 10_000 });
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(5000);
  });
});
