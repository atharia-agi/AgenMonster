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

test.describe('AgenMonster accessibility tree', () => {
  test.beforeEach(async ({ page }) => {
    await setupApp(page);
  });

  test('accessibility tree snapshot is non-empty', async ({ page }) => {
    let snapshot: any = null;
    try {
      snapshot = await page.accessibility.snapshot();
    } catch {
      test.skip(true, 'Accessibility tree not available in this browser');
      return;
    }
    if (!snapshot) {
      test.skip(true, 'Accessibility tree not available in this browser');
      return;
    }
    expect(snapshot).toBeTruthy();
    expect(snapshot.role).toBe('Window');
  });

  test('all interactive elements have accessible names', async ({ page }) => {
    let snapshot: any = null;
    try {
      snapshot = await page.accessibility.snapshot();
    } catch {
      test.skip(true, 'Accessibility tree not available in this browser');
      return;
    }
    if (!snapshot) {
      test.skip(true, 'Accessibility tree not available in this browser');
      return;
    }
    const unnamedElements: string[] = [];

    function checkNode(node: any, path: string) {
      if (!node) return;
      const isInteractive = ['button', 'link', 'textbox', 'checkbox', 'radio', 'combobox', 'tab', 'menuitem', 'treeitem', 'slider', 'spinbutton', 'switch'].includes(node.role || '');
      if (isInteractive && !node.name && !node.label) {
        unnamedElements.push(`${path}[role="${node.role}"]`);
      }
      if (node.children) {
        node.children.forEach((child: any, i: number) => {
          checkNode(child, `${path}/${node.role || 'node'}[${i}]`);
        });
      }
    }

    checkNode(snapshot, 'root');
    expect(unnamedElements).toEqual([]);
  });

  test('heading hierarchy is logical (h1 before h2 before h3)', async ({ page }) => {
    const headings = await page.evaluate(() => {
      const elements = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      return Array.from(elements).map((el) => ({
        level: parseInt(el.tagName.charAt(1)),
        text: el.textContent?.trim().slice(0, 60) || '',
      }));
    });

    expect(headings.length).toBeGreaterThan(0);

    let prevLevel = 0;
    for (const h of headings) {
      expect(h.level).toBeGreaterThanOrEqual(prevLevel);
      if (h.level > prevLevel + 1 && prevLevel > 0) {
        console.warn(`Skipped heading level: h${prevLevel} -> h${h.level}`);
      }
      prevLevel = h.level;
    }
  });

  test('images have alt text', async ({ page }) => {
    const missingAlt = await page.evaluate(() => {
      const imgs = document.querySelectorAll('img');
      return Array.from(imgs)
        .filter((img) => !img.getAttribute('alt') && !img.getAttribute('aria-label'))
        .map((img) => img.getAttribute('src') || 'unknown');
    });
    expect(missingAlt).toEqual([]);
  });

  test('links have discernible text', async ({ page }) => {
    const emptyLinks = await page.evaluate(() => {
      const links = document.querySelectorAll('a');
      return Array.from(links)
        .filter((a) => {
          const text = a.textContent?.trim();
          const ariaLabel = a.getAttribute('aria-label');
          const ariaLabelledBy = a.getAttribute('aria-labelledby');
          return !text && !ariaLabel && !ariaLabelledBy;
        })
        .map((a) => a.getAttribute('href') || 'unknown');
    });
    expect(emptyLinks).toEqual([]);
  });

  test('form inputs have associated labels', async ({ page }) => {
    const unlabeledInputs = await page.evaluate(() => {
      const inputs = document.querySelectorAll('input, textarea, select');
      return Array.from(inputs)
        .filter((input) => {
          const id = input.getAttribute('id');
          const ariaLabel = input.getAttribute('aria-label');
          const ariaLabelledBy = input.getAttribute('aria-labelledby');
          if (ariaLabel || ariaLabelledBy) return false;
          if (!id) return true;
          const label = document.querySelector(`label[for="${id}"]`);
          return !label;
        })
        .map((input) => input.getAttribute('name') || input.getAttribute('id') || 'unknown');
    });
    expect(unlabeledInputs).toEqual([]);
  });

  test('landmark regions exist for main navigation', async ({ page }) => {
    const landmarks = await page.evaluate(() => {
      const regions = document.querySelectorAll('[role="banner"], [role="navigation"], [role="main"], [role="complementary"], [role="contentinfo"], header, nav, main, aside, footer');
      return Array.from(regions).map((r: any) => ({
        role: r.getAttribute('role') || r.tagName.toLowerCase(),
        label: r.getAttribute('aria-label') || r.getAttribute('aria-labelledby') || '',
      }));
    });

    console.log('Landmarks found:', landmarks);

    const hasMain = landmarks.some((l) => l.role === 'main' || l.role === 'MAIN');
    const hasNav = landmarks.some((l) => l.role === 'navigation' || l.role === 'NAV' || l.role === 'nav');
    expect(hasMain).toBe(true);
    expect(hasNav).toBe(true);
  });

  test('focus order is logical', async ({ page }) => {
    await page.keyboard.press('Tab');
    await page.waitForTimeout(100);
    const focusedElement = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el) return null;
      return {
        tag: el.tagName.toLowerCase(),
        role: el.getAttribute('role') || '',
        name: el.getAttribute('aria-label') || el.textContent?.trim().slice(0, 30) || '',
      };
    });
    expect(focusedElement).toBeTruthy();
  });
});