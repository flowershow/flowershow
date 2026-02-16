/**
 * Playwright Config — Dashboard E2E Tests
 *
 * Tests dashboard UI interactions (site creation, settings, Stripe) and
 * the home landing page (drop-zone file upload).
 *
 * These tests are local-only — they require browser-based auth and Stripe CLI.
 *
 * Run with: npx playwright test -c playwright.dashboard.config.ts
 */

import { defineConfig, devices } from '@playwright/test';
import 'dotenv/config';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list', { printSteps: true }], ['html']],

  use: {
    baseURL: `http://${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`,
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'home-chromium',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: `http://${process.env.NEXT_PUBLIC_HOME_DOMAIN}`,
      },
      testMatch: /home\/.+\.spec\.ts/,
    },
    {
      name: 'dashboard-setup',
      testMatch: /dashboard\/global\.setup\.ts/,
      teardown: 'dashboard-teardown',
    },
    {
      name: 'dashboard-teardown',
      testMatch: /dashboard\/global\.teardown\.ts/,
    },
    {
      name: 'dashboard-chromium',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /dashboard\/.+\.spec\.ts/,
      dependencies: ['dashboard-setup'],
    },
  ],
});
