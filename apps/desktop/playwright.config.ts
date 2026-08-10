import { defineConfig, devices } from '@playwright/test';

const devServer = process.env.E2E_URL ? undefined : {
  command: 'npm run dev',
  url: 'http://localhost:1420',
  timeout: 120_000,
  reuseExistingServer: !process.env.CI,
};

const snapshotDir = 'tests/snapshots';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: !process.env.CI,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 2,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  timeout: 180000,
  expect: { 
    timeout: 60000,
    toHaveScreenshot: { 
      maxDiffPixels: 100,
      threshold: 0.2,
    },
  },
  snapshotDir,
  snapshotPathTemplate: '{snapshotDir}/{testFilePath}/{arg}{ext}',
  updateSnapshots: process.env.UPDATE_SNAPSHOTS ? 'all' : 'none',
  use: {
    baseURL: process.env.E2E_URL || 'http://localhost:1420',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 30000,
    navigationTimeout: 60000,
    ...devices['Desktop Chrome'],
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },

    { name: 'iPhone 13 (chromium)', use: { ...devices['iPhone 13'] } },
    { name: 'iPhone 14 Pro (chromium)', use: { ...devices['iPhone 14 Pro'] } },
    { name: 'Pixel 5 (chromium)', use: { ...devices['Pixel 5'] } },
    { name: 'Pixel 7 (chromium)', use: { ...devices['Pixel 7'] } },
    { name: 'Galaxy S24 (chromium)', use: { ...devices['Galaxy S24'] } },
    { name: 'iPhone 14 Pro Max (chromium)', use: { ...devices['iPhone 14 Pro Max'] } },
    { name: 'Pixel 7 Pro (chromium)', use: { ...devices['Pixel 7 Pro'] } },

    { name: 'iPhone 12 (webkit)', use: { ...devices['iPhone 12'] } },
    { name: 'iPhone 14 Pro (webkit)', use: { ...devices['iPhone 14 Pro'] } },
    { name: 'iPhone 13 (webkit)', use: { ...devices['iPhone 13'] } },

    { name: 'iPad Pro 11 (chromium)', use: { ...devices['iPad Pro 11'] } },
    { name: 'iPad (gen 7) (chromium)', use: { ...devices['iPad (gen 7)'] } },
    { name: 'Galaxy Tab S9 (chromium)', use: { ...devices['Galaxy Tab S9'] } },

    { name: 'iPad Pro 11 (webkit)', use: { ...devices['iPad Pro 11'] } },
    { name: 'iPad Mini (webkit)', use: { ...devices['iPad Mini'] } },

    { name: 'iPhone 13 landscape', use: { ...devices['iPhone 13'], viewport: { width: 667, height: 375 } } },
    { name: 'Pixel 5 landscape', use: { ...devices['Pixel 5'], viewport: { width: 728, height: 393 } } },
    { name: 'iPad Pro 11 landscape', use: { ...devices['iPad Pro 11'], viewport: { width: 1194, height: 834 } } },
  ],
  webServer: devServer,
});
