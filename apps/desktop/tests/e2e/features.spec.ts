// @ts-nocheck
import { test, expect } from '@playwright/test';

test.describe('AgenMonster features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      try { localStorage.setItem('agenmonster_welcomed', '1'); } catch {}
    });
    await page.reload();
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    await page.locator('.app-shell').waitFor({ state: 'visible', timeout: 30000 });
  });

  test('settings tab opens panel and theme select switches data-theme', async ({ page }) => {
    await page.getByRole('button', { name: 'SETTINGS' }).click();
    await expect(page.locator('.panel-title', { hasText: /settings/i })).toBeVisible({ timeout: 10000 });
    // Open cosmetics section
    await page.getByRole('button', { name: /COSMETICS/i }).click();
    const select = page.locator('.body select').first();
    await expect(select).toBeVisible({ timeout: 5000 });
    // Saved preference wins on reload: switch to dawn, verify attribute.
    await select.selectOption('gb-dawn');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'gb-dawn');
    const saved = await page.evaluate(() => localStorage.getItem('agenmonster_theme'));
    expect(saved).toBe('gb-dawn');
  });

  test('slash /remember then /stats roundtrips in chat', async ({ page }) => {
    const input = page.locator('.chat-input textarea').first();
    await input.fill('/remember e2ekey: e2evalue');
    await input.press('Enter');
    await expect(page.locator('.chat-msg.assistant .bubble').last()).toContainText('Remembered:', { timeout: 5000 });
    const mem = await page.evaluate(() => localStorage.getItem('agenmonster_memory'));
    expect(mem).toContain('e2ekey');
    await input.fill('/stats');
    await input.press('Enter');
    await expect(page.locator('.chat-msg.assistant .bubble').last()).toContainText('Stats:', { timeout: 5000 });
  });

  test('/new creates a thread and thread chip appears', async ({ page }) => {
    const input = page.locator('.chat-input textarea').first();
    await input.fill('/new E2E Thread');
    await input.press('Enter');
    await expect(page.locator('.chat-msg.assistant .bubble').last()).toContainText('Created thread', { timeout: 5000 });
    await expect(page.locator('.thread-btn', { hasText: /E2E Thread/ })).toBeVisible({ timeout: 5000 });
  });

  test('left sidebar toggle collapses and restores panels', async ({ page }) => {
    await expect(page.locator('.status-panel').first()).toBeVisible({ timeout: 15000 });
    const toggle = page.locator('.sidebar-toggle-btn').first();
    await toggle.click();
    await expect(page.locator('.status-panel')).toHaveCount(0);
    await toggle.click();
    await expect(page.locator('.status-panel').first()).toBeVisible({ timeout: 5000 });
  });

  test('memory persists across reload (fact written by /remember)', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      try { localStorage.setItem('agenmonster_welcomed', '1'); } catch {}
    });
    await page.reload();
    await page.locator('.app-shell').waitFor({ state: 'visible', timeout: 10000 });
    const input = page.locator('.chat-input textarea').first();
    await input.fill('/remember persistkey: hello_persist');
    await page.locator('.send-btn').first().click();
    await expect(page.locator('.chat-msg.assistant .bubble').last()).toContainText('Remembered: persistkey', { timeout: 5000 });
    await page.reload();
    await page.locator('.app-shell').waitFor({ state: 'visible', timeout: 10000 });
    const raw = await page.evaluate(() => localStorage.getItem('agenmonster_memory'));
    expect(raw).toBeTruthy();
    expect(raw).toContain('hello_persist');
  });
});