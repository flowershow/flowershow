import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import {
  FREE_SITE_BASE_PATH,
  PREMIUM_SITE_CUSTOM_DOMAIN,
} from './e2e/helpers/seed';

dotenv.config();

export default defineConfig({
  testDir: './e2e/specs',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 2,
  timeout: process.env.CI ? 120 * 1000 : 60 * 1000,
  expect: { timeout: process.env.CI ? 10 * 1000 : 5 * 1000 },
  reporter: process.env.CI
    ? [
        ['list'], // Shows each test as it runs in CI logs
        ['html'], // Still generates HTML report for artifacts
        ['github'], // Adds GitHub annotations
      ]
    : 'html',
  use: {
    trace: process.env.CI ? 'retain-on-failure' : 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'setup',
      testDir: './e2e',
      testMatch: 'setup.ts',
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: `http://${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`,
        basePath: FREE_SITE_BASE_PATH,
      } as any,
      dependencies: ['setup'],
    },
    {
      name: 'custom-domain',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: `http://${PREMIUM_SITE_CUSTOM_DOMAIN}`,
        basePath: '',
      } as any,
      testMatch: '**/links-and-embeds.spec.ts',
      dependencies: ['setup'],
    },
    {
      name: 'teardown',
      testDir: './e2e',
      testMatch: 'teardown.ts',
      dependencies: ['chromium', 'custom-domain'],
    },
  ],
});
