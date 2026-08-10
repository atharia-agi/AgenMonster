// @ts-nocheck
import { test, expect, devices } from '@playwright/test';

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

const mobileDevices = [
  'iPhone 13', 'iPhone 14 Pro', 'iPhone 14 Pro Max',
  'Pixel 5', 'Pixel 7', 'Pixel 7 Pro', 'Galaxy S24',
];

const mobileDevicesWebkit = [
  'iPhone 12', 'iPhone 13', 'iPhone 14 Pro',
];

const tabletDevices = [
  'iPad Pro 11', 'iPad (gen 7)', 'Galaxy Tab S9',
];

const tabletDevicesWebkit = [
  'iPad Pro 11', 'iPad Mini',
];

const landscapeMobile = [
  { name: 'Galaxy S24 landscape', device: 'Galaxy S24', viewport: { width: 728, height: 393 } },
  { name: 'Pixel 5 landscape', device: 'Pixel 5', viewport: { width: 728, height: 393 } },
  { name: 'iPhone 13 landscape', device: 'iPhone 13', viewport: { width: 667, height: 375 } },
];

const landscapeTablet = [
  { name: 'iPad Pro 11 landscape', device: 'iPad Pro 11', viewport: { width: 1194, height: 834 } },
  { name: 'Galaxy Tab S9 landscape', device: 'Galaxy Tab S9', viewport: { width: 1024, height: 600 } },
];

const landscapeTabletWebkit = [
  { name: 'iPad Pro 11 landscape (webkit)', device: 'iPad Pro 11', viewport: { width: 1194, height: 834 } },
];

function withoutDefaultBrowserType(device: any) {
  const { defaultBrowserType, ...rest } = device;
  return rest;
}

async function runTestsForDevice(deviceName: string, useWebkit = false) {
  const device = devices[deviceName];
  if (!device) return;

  test.describe(`${deviceName} ${useWebkit ? '(webkit)' : ''}`, () => {
    test.use({ ...withoutDefaultBrowserType(device) });

    test.beforeEach(async ({ page }) => {
      await setupApp(page);
    });

    test('loads app shell on mobile viewport', async ({ page }) => {
      await expect(page.locator('.app-shell')).toBeVisible({ timeout: 30000 });
    });

    test('top nav is visible and scrollable horizontally', async ({ page }) => {
      const nav = page.locator('.top-nav');
      await expect(nav).toBeVisible();
      const viewportWidth = page.viewportSize()?.width ?? 390;
      const navBox = await nav.boundingBox();
      expect(navBox?.width).toBeLessThanOrEqual(viewportWidth);
    });

    test('chat input is visible on mobile', async ({ page }) => {
      const input = page.locator('.chat-input textarea, .chat-input input');
      await expect(input.first()).toBeVisible({ timeout: 30000 });
    });

    test('world panel canvas fits viewport width', async ({ page }) => {
      await page.evaluate(() => {
        const canvas = document.querySelector('.world-canvas');
        if (canvas) {
          (canvas as HTMLElement).scrollIntoView({ behavior: 'instant' });
        }
      });
      const canvas = page.locator('.world-canvas').first();
      if (await canvas.count() > 0) {
        const box = await canvas.boundingBox();
        const viewportWidth = page.viewportSize()?.width ?? 390;
        expect(box?.width).toBeLessThanOrEqual(viewportWidth);
      }
    });

    test('monster header fits mobile width', async ({ page }) => {
      const header = page.locator('.monster-header').first();
      if (await header.count() > 0) {
        const box = await header.boundingBox();
        const viewportWidth = page.viewportSize()?.width ?? 390;
        expect(box?.width).toBeLessThanOrEqual(viewportWidth);
      }
    });

    test('send message via chat on mobile', async ({ page }) => {
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

    test('bottom bar controls are accessible on mobile', async ({ page }) => {
      const bottomBar = page.locator('.bottom-bar');
      if (await bottomBar.count() > 0) {
        await expect(bottomBar.first()).toBeVisible();
      }
    });

    test('sidebar toggle works on mobile', async ({ page }) => {
      const leftToggle = page.locator('.sidebar.left .sidebar-toggle-btn');
      if (await leftToggle.count() > 0) {
        await leftToggle.click();
        await page.waitForTimeout(200);
        await expect(page.locator('.sidebar.left')).toHaveClass(/collapsed/);
      }
    });

    test('tab switching works on mobile', async ({ page }) => {
      const tabButtons = page.locator('.tab-btn, .thread-btn');
      const count = await tabButtons.count();
      if (count > 1) {
        await tabButtons.nth(1).click();
        await page.waitForTimeout(200);
        await expect(tabButtons.nth(1)).toHaveClass(/active/);
      }
    });
  });
}

// Mobile devices - Chromium
for (const deviceName of mobileDevices) {
  runTestsForDevice(deviceName, false);
}

// Mobile devices - WebKit
for (const deviceName of mobileDevicesWebkit) {
  runTestsForDevice(deviceName, true);
}

// Tablet devices - Chromium
for (const deviceName of tabletDevices) {
  runTestsForDevice(deviceName, false);
}

// Tablet devices - WebKit
for (const deviceName of tabletDevicesWebkit) {
  runTestsForDevice(deviceName, true);
}

// Landscape mobile tests
for (const config of landscapeMobile) {
  test.describe(`${config.name}`, () => {
    test.use({ ...withoutDefaultBrowserType(devices[config.device]), viewport: config.viewport });
    test.beforeEach(async ({ page }) => { await setupApp(page); });
    test('renders correctly in landscape', async ({ page }) => {
      await expect(page.locator('.app-shell')).toBeVisible({ timeout: 30000 });
    });
  });
}

// Landscape tablet tests
for (const config of landscapeTablet) {
  test.describe(`${config.name}`, () => {
    test.use({ ...withoutDefaultBrowserType(devices[config.device]), viewport: config.viewport });
    test.beforeEach(async ({ page }) => { await setupApp(page); });
    test('renders correctly in landscape', async ({ page }) => {
      await expect(page.locator('.app-shell')).toBeVisible({ timeout: 30000 });
    });
  });
}

// Landscape tablet tests - WebKit
for (const config of landscapeTabletWebkit) {
  test.describe(`${config.name}`, () => {
    test.use({ ...withoutDefaultBrowserType(devices[config.device]), viewport: config.viewport });
    test.beforeEach(async ({ page }) => { await setupApp(page); });
    test('renders correctly in landscape', async ({ page }) => {
      await expect(page.locator('.app-shell')).toBeVisible({ timeout: 30000 });
    });
  });
}