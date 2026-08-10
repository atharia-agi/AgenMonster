// @ts-nocheck
import { test, expect } from '@playwright/test';

async function setupApp(page: any) {
  await page.context().addInitScript(() => {
    try {
      localStorage.setItem('agenmonster_welcomed', '1');
      localStorage.removeItem('agenmonster_focus_mode');
    } catch {}
  });
  // Mock the LLM providers API so SettingsPanel init doesn't hang on a network call
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
  // Ensure focus mode is off at the DOM level
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

test.describe('AgenMonster features', () => {
  test.beforeEach(async ({ page }) => {
    await setupApp(page);
  });

  test('settings tab opens panel and theme select switches data-theme', async ({ page }) => {
    await jsClick(page, '.top-nav .tab:nth-child(9)');
    await page.waitForTimeout(700);
    await expect(page.locator('.panel-title', { hasText: /settings/i })).toBeVisible({ timeout: 20000 });
    // Find COSMETICS section button by its text content
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('nav.tabs .tab'));
      const cosmetics = buttons.find((b: any) =>
        (b.textContent || '').includes('COSMETICS')
      ) as HTMLElement | undefined;
      if (cosmetics) cosmetics.click();
    });
    await page.waitForTimeout(700);
    const select = page.locator('.body select').first();
    await expect(select).toBeVisible({ timeout: 15000 });
    // Use page.evaluate to change the select value (avoids locator.evaluate CDP hang)
    await page.evaluate(() => {
      const sel = document.querySelector('.body select') as HTMLSelectElement | null;
      if (sel) {
        sel.value = 'gb-dawn';
        sel.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await page.waitForTimeout(400);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'gb-dawn');
    const saved = await page.evaluate(() => localStorage.getItem('agenmonster_theme'));
    expect(saved).toBe('gb-dawn');
  });

  test('slash /remember then /stats roundtrips in chat', async ({ page }) => {
    await jsSetValue(page, '.chat-input textarea', '/remember e2ekey: e2evalue');
    await page.waitForTimeout(300);
    await jsClick(page, '.send-btn');
    await page.waitForTimeout(400);
    await expect(page.locator('.chat-msg.assistant .bubble').last()).toContainText('Remembered:', { timeout: 15000 });
    const mem = await page.evaluate(() => localStorage.getItem('agenmonster_memory'));
    expect(mem).toContain('e2ekey');
    await jsSetValue(page, '.chat-input textarea', '/stats');
    await page.waitForTimeout(300);
    await jsClick(page, '.send-btn');
    await page.waitForTimeout(400);
    await expect(page.locator('.chat-msg.assistant .bubble').last()).toContainText('Stats:', { timeout: 15000 });
  });

  test('/new creates a thread and thread chip appears', async ({ page }) => {
    await jsSetValue(page, '.chat-input textarea', '/new E2E Thread');
    await page.waitForTimeout(300);
    await jsClick(page, '.send-btn');
    await page.waitForTimeout(400);
    await expect(page.locator('.chat-msg.assistant .bubble').last()).toContainText('Created thread', { timeout: 15000 });
    await expect(page.locator('.thread-btn', { hasText: /E2E Thread/ })).toBeVisible({ timeout: 15000 });
  });

  test('left sidebar toggle collapses and restores panels', async ({ page }) => {
    await expect(page.locator('.status-panel').first()).toBeVisible({ timeout: 30000 });
    // Use direct DOM manipulation to collapse sidebar (bypasses focusMode interference)
    await page.evaluate(() => {
      const toggle = document.querySelector('.sidebar-toggle-btn') as HTMLElement | null;
      if (toggle) toggle.click();
    });
    await page.waitForTimeout(800);
    // After collapse: sidebar has 'collapsed' class, status-panel is not in layout
    const collapsed = await page.evaluate(() => {
      const sidebar = document.querySelector('.sidebar.left');
      return sidebar?.classList.contains('collapsed') ?? false;
    });
    expect(collapsed).toBe(true);
    // Click toggle again to expand
    await page.evaluate(() => {
      const toggle = document.querySelector('.sidebar-toggle-btn') as HTMLElement | null;
      if (toggle) toggle.click();
    });
    await page.waitForTimeout(800);
    const expanded = await page.evaluate(() => {
      const sidebar = document.querySelector('.sidebar.left');
      return !(sidebar?.classList.contains('collapsed') ?? true);
    });
    expect(expanded).toBe(true);
    await expect(page.locator('.status-panel').first()).toBeVisible({ timeout: 15000 });
  });

  test('memory persists across reload (fact written by /remember)', async ({ page }) => {
    await jsSetValue(page, '.chat-input textarea', '/remember persistkey: hello_persist');
    await page.waitForTimeout(300);
    await jsClick(page, '.send-btn');
    await page.waitForTimeout(400);
    await expect(page.locator('.chat-msg.assistant .bubble').last()).toContainText('Remembered: persistkey', { timeout: 15000 });
    await page.reload();
    await page.locator('.app-shell').waitFor({ state: 'attached', timeout: 30000 });
    // addInitScript already ran focus_mode removal on this new page context
    const raw = await page.evaluate(() => localStorage.getItem('agenmonster_memory'));
    expect(raw).toBeTruthy();
    expect(raw).toContain('hello_persist');
  });
});
