import { defineConfig, devices } from "@playwright/test";

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
import "dotenv/config";

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: "./e2e",
  /* Run tests in files in parallel */
  fullyParallel: false,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [["list", { printSteps: true }], ["html"]],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: "http://localhost:3000",

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: "on-first-retry",
  },
  /* Configure projects for major browsers */
  /** Note: Test fixtures rely on the names, so remember to update them as well if renaming the projects below.*/
  projects: [
    {
      name: "dashboard-setup",
      testMatch: /dashboard\/global\.setup\.ts/,
      teardown: "dashboard-teardown",
    },
    {
      name: "dashboard-teardown",
      testMatch: /dashboard\/global\.teardown\.ts/,
    },
    {
      name: "dashboard-chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
      testMatch: /dashboard\/.+\.spec\.ts/,
      dependencies: ["dashboard-setup"],
    },
    {
      name: "free-site-setup",
      testMatch: /free-site\/global\.setup\.ts/,
      teardown: "free-site-teardown",
    },
    {
      name: "free-site-teardown",
      testMatch: /free-site\/global\.teardown\.ts/,
    },
    {
      name: "free-site-chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
      dependencies: ["free-site-setup"],
      testMatch: /free-site\/.+\.spec\.ts/,
    },
    {
      name: "premium-site-setup",
      testMatch: /premium-site\/global\.setup\.ts/,
      teardown: "premium-site-teardown",
    },
    {
      name: "premium-site-teardown",
      testMatch: /premium-site\/global\.teardown\.ts/,
    },
    {
      name: "premium-site-chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
      dependencies: ["premium-site-setup"],
      testMatch: /premium-site\/.+\.spec\.ts/,
    },
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },

    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],
});
