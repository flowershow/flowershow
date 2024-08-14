import { test, expect } from "@playwright/test";

import "dotenv/config";

test.describe.configure({ mode: "parallel" });

test.describe("Check if content is visible based on contentInclude/contentExclude config", () => {
  test("Excluded folders and Files are not shown", async ({ page }) => {
    await page.goto(process.env.E2E_TEST_SITE! + `/blog/trash/trash-article-1`);
    const heading = page.locator("h1");
    await expect(heading).toHaveText("404");
  });

  test("Specific Excluded File is not shown", async ({ page }) => {
    await page.goto(process.env.E2E_TEST_SITE! + `/blog/trash-article`);
    const heading = page.locator("h1");
    await expect(heading).toHaveText("404");
  });

  test("Content with isDraft: true is not shown", async ({ page }) => {
    await page.goto(process.env.E2E_TEST_SITE! + `/blog/draft-article`);
    const heading = page.locator("h1");
    await expect(heading).toHaveText("404");
  });
});
