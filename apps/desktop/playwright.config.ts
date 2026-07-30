import { defineConfig, devices } from '@playwright/test';

const devServer = process.env.E2E_URL ? undefined : {
  command: 'npm run dev',
  url: 'http://localhost:1420',
  timeout: 60_000,
  reuseExistingServer: !process.env.CI,
};

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: !process.env.CI,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : 2,
  reporter: 'list',
  use: {
    baseURL: process.env.E2E_URL || 'http://localhost:1420',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    ...devices['Desktop Chrome'],
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: devServer,
});
