import { test, expect } from "@playwright/test";
import { testSite } from "./test-utils";

test.describe.configure({ mode: "parallel" });

test.describe("Check if content is visible based on contentInclude/contentExclude config", () => {
  test("Excluded folders and Files are not shown", async ({ page }) => {
    await page.goto(testSite + `/blog/trash/trash-article-1`);
    const heading = page.locator("h1");
    await expect(heading).toHaveText("404");
  });

  test("Specific Excluded File is not shown", async ({ page }) => {
    await page.goto(testSite + `/blog/trash-article`);
    const heading = page.locator("h1");
    await expect(heading).toHaveText("404");
  });

  test("Content with publish: false is not shown", async ({ page }) => {
    await page.goto(testSite + `/blog/draft-article`);
    const heading = page.locator("h1");
    await expect(heading).toHaveText("404");
  });
});
