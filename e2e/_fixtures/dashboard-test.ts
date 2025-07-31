import fs from "fs";
import { test as baseTest } from "@playwright/test";
import { SiteSettingsPage } from "./site-settings-page";
// Using dynamic import for ES Module compatibility
const randomWord = async () => (await import("random-word")).default();

import "dotenv/config";

type MyFixtures = {
  siteSettingsPage: SiteSettingsPage;
  createSite: (opts?: { branch?: string; rootDir?: string }) => Promise<void>;
};

export const test = baseTest.extend<MyFixtures, { workerStorageState: string }>(
  {
    context: async ({ browser }, use) => {
      const storage = JSON.parse(
        fs.readFileSync(
          require.resolve("../../playwright/.auth/user.json"),
          "utf-8",
        ),
      );
      const ctx = await browser.newContext({
        storageState: storage,
        baseURL: `http://${process.env.NEXT_PUBLIC_CLOUD_DOMAIN}`,
      });
      await ctx.addCookies([
        {
          name: "feedback-dismissed",
          value: "true",
          url: `http://${process.env.NEXT_PUBLIC_CLOUD_DOMAIN}`,
        },
      ]);
      await use(ctx);
      await ctx.close();
    },
    siteSettingsPage: async ({ page }, use, testInfo) => {
      let siteId;
      try {
        const env = JSON.parse(
          fs.readFileSync(
            require.resolve("../../playwright/test-env.json"),
            "utf-8",
          ),
        );

        const testProject = testInfo.project.name;
        const testSiteKey = testProject.startsWith("dashboard")
          ? "dashboard"
          : testProject.startsWith("premium-site")
            ? "premiumSite"
            : "freeSite";

        siteId = env[testSiteKey].siteId;
      } catch {
        // test-env.json is only created after global setup, this this try catch
        siteId = "";
      }
      await use(new SiteSettingsPage(page, siteId));
    },
    createSite: async ({ page, siteSettingsPage }, use, testInfo) => {
      await use(async (opts = {}) => {
        // const { branch = "main", rootDir = "/" } = opts;

        await page.goto("/");
        await expect(page).not.toHaveURL(/\/login$/);

        await expect(
          page.getByRole("link", { name: /Publish your markdown/i }),
        ).toBeVisible();
        await page
          .getByRole("link", { name: /Publish your markdown/i })
          .click();
        await expect(page).toHaveURL(/\/new/);
        await expect(page.getByTestId("create-site-form")).toBeVisible();

        try {
          await page.getByLabel("GitHub Account").selectOption("flowershow");
        } catch {
          await page
            .getByLabel("GitHub Account")
            .selectOption(process.env.GH_E2E_TEST_ACCOUNT!);
        }

        await page
          .getByLabel("Repository")
          .selectOption("flowershow-test-repo");

        // await page.getByLabel("Branch").fill(branch);
        // await page.getByLabel("Root Dir").fill(rootDir);

        await page.getByRole("button", { name: /Create Site/i }).click();
        await expect(page).toHaveURL(/\/site\/[a-z0-9]+\/settings/);

        const word = await randomWord();
        const name = `test-site-${word}`;
        await siteSettingsPage.nameInput.fill(name);
        await siteSettingsPage.nameSaveButton.click();
        await expect(siteSettingsPage.siteName).toHaveText(name);

        const syncStatus = page.getByTestId("sync-status");
        await expect(syncStatus).toHaveText("Synced", { timeout: 60_000 });

        const url = page.url();
        const match = url.match(/\/site\/([a-z0-9]+)\/settings/);

        const testProject = testInfo.project.name;
        const testSiteKey = testProject.startsWith("dashboard")
          ? "dashboard"
          : testProject.startsWith("premium-site")
            ? "premiumSite"
            : "freeSite";

        if (match?.[1]) {
          const siteId = match[1];
          fs.writeFileSync(
            "playwright/test-env.json",
            JSON.stringify({
              [testSiteKey]: { siteId, siteName: name },
            }),
          );
        } else {
          throw new Error("Failed to extract site ID from URL");
        }
      });
    },
  },
);
export const expect = test.expect;
