import { test, expect } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const snapshotDir = join(process.cwd(), 'tests', 'snapshots', 'visual-regression.spec.ts');

function ensureSnapshotDir() {
  mkdirSync(snapshotDir, { recursive: true });
}

test.describe('Visual Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('.app-shell', { timeout: 60000 });
  });

  test('Main dashboard @visual', async ({ page }) => {
    await page.waitForTimeout(3000);
    await expect(page).toHaveScreenshot('main-dashboard.png', {
      fullPage: true,
      animations: 'disabled',
      maxDiffPixels: 5000,
    });
  });

  test('Chat panel @visual', async ({ page }) => {
    await page.evaluate(() => {
      const tab = Array.from(document.querySelectorAll('.tab')).find(
        (btn) => (btn as HTMLElement).textContent?.includes('WORKSPACE')
      );
      if (tab instanceof HTMLButtonElement) tab.click();
    });

    await page.waitForTimeout(2000);
    await page.locator('.chat-panel').waitFor({ state: 'visible', timeout: 60000 });

    const clip = await page.evaluate(() => {
      const el = document.querySelector('.chat-panel') as HTMLElement | null;
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    });

    if (clip) {
      const buffer = await page.screenshot({ clip, timeout: 120000 });
      ensureSnapshotDir();
      writeFileSync(join(snapshotDir, 'chat-panel.png'), buffer);
    }
  });

  test('Settings panel @visual', async ({ page }) => {
    await page.evaluate(() => {
      const tab = Array.from(document.querySelectorAll('.tab')).find(
        (btn) => (btn as HTMLElement).textContent?.includes('SETTINGS')
      );
      if (tab instanceof HTMLButtonElement) tab.click();
    });

    await page.waitForTimeout(2000);
    await page.locator('.panel').waitFor({ state: 'visible', timeout: 60000 });

    const clip = await page.evaluate(() => {
      const el = document.querySelector('.panel') as HTMLElement | null;
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    });

    if (clip) {
      const buffer = await page.screenshot({ clip, timeout: 120000 });
      ensureSnapshotDir();
      writeFileSync(join(snapshotDir, 'settings-panel.png'), buffer);
    }
  });

  test('Mobile viewport - iPhone 13 @visual', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('mobile-iphone13.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('Tablet viewport - iPad Pro 11 @visual', async ({ page }) => {
    await page.setViewportSize({ width: 834, height: 1194 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('tablet-ipadpro11.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('Dark theme @visual', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem('theme', 'dark');
      document.documentElement.classList.add('dark');
    });
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('dark-theme.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('Dawn theme @visual', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem('theme', 'dawn');
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('dawn');
    });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('dawn-theme.png', {
      fullPage: true,
      animations: 'disabled',
      timeout: 30000,
    });
  });
});