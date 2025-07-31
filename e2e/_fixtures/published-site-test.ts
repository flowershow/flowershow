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
      } catch {
        siteName = "";
      }

      if (testInfo.project.name.startsWith("premium-site")) {
        await use(new PublishedSitePage(page, siteName, "test.localhost:3000"));
      } else {
        await use(new PublishedSitePage(page, siteName));
      }
    },
  },
);
export const expect = test.expect;
