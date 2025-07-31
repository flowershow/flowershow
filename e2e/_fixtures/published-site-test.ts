import fs from "fs";
import { test as baseTest } from "@playwright/test";
import { PublishedSitePage } from "./published-site-page";

import "dotenv/config";

type MyFixtures = {
  publishedSitePage: PublishedSitePage;
};

export const test = baseTest.extend<MyFixtures, { workerStorageState: string }>(
  {
    publishedSitePage: async ({ page }, use, testInfo) => {
      let siteName;

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

        siteName = env[testSiteKey].siteName;

        if (testProject.startsWith("premium-site")) {
          await use(
            new PublishedSitePage(page, siteName, "test.localhost:3000"),
          );
        } else {
          await use(new PublishedSitePage(page, siteName));
        }
      } catch {
        // test-env.json is only created after global setup, this this try catch
      }
    },
  },
);
export const expect = test.expect;
