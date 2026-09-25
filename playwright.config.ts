import { defineConfig, devices } from '@playwright/test';
import { BASE_URL } from './tests/support/site.ts';

const CI = Boolean(process.env['CI']);

export default defineConfig({
  testDir: 'tests',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  reporter: CI ? [['github'], ['list']] : 'list',
  use: { baseURL: BASE_URL },
  webServer: {
    command: 'pnpm serve',
    url: BASE_URL,
    reuseExistingServer: !CI,
    timeout: 120_000,
  },
  projects: [
    { name: 'chromium', testDir: 'tests/e2e', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit', testDir: 'tests/e2e', use: { ...devices['Desktop Safari'] } },
    { name: 'firefox', testDir: 'tests/e2e', use: { ...devices['Desktop Firefox'] } },
  ],
});
