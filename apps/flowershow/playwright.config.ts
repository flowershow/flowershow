import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config();

const ROOT_DOMAIN =
  process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'my.flowershow.local:3000';

export default defineConfig({
  testDir: './e2e/specs',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 2,
  timeout: process.env.CI ? 120 * 1000 : 30 * 1000,
  expect: { timeout: process.env.CI ? 20 * 1000 : 5 * 1000 },
  reporter: 'html',
  use: {
    baseURL: `http://${ROOT_DOMAIN}`,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'setup',
      testDir: './e2e',
      testMatch: 'setup.ts',
    },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
    {
      name: 'teardown',
      testDir: './e2e',
      testMatch: 'teardown.ts',
    },
  ],
});
