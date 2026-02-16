/**
 * Playwright Config — Renderer E2E Tests
 *
 * Tests how published sites render content (free-site + premium-site).
 * Uses a DB-seeded global setup (no browser needed for setup/teardown).
 *
 * Run with: npx playwright test -c playwright.renderer.config.ts
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

  globalSetup: './e2e/renderer/global-setup.ts',
  globalTeardown: './e2e/renderer/global-teardown.ts',

  use: {
    baseURL: `http://${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`,
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'free-site-chromium',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /free-site\/.+\.spec\.ts/,
    },
    {
      name: 'premium-site-chromium',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /premium-site\/.+\.spec\.ts/,
    },
  ],
});
