import { test, expect } from "@playwright/test";

import "dotenv/config";

test("Data story with frontmatter metadata", async ({ page }) => {
  await page.goto(`${process.env.E2E_TEST_SITE!}/blog/post-1`);

  const header = page.getByTestId("story-header");

  await expect(header.locator("h1")).toHaveCount(1);
  await expect(header.locator("h1").first()).toHaveText("Blog Post 1");

  await expect(header.locator("p")).toContainText("Blog Post 1 Description");

  const author = header.getByTestId("story-author").first();
  await expect(author).toContainText("John Doe");

  await expect(header.locator("time")).toContainText("June 6, 2024");
});

test("Data story without frontmatter metadata", async ({ page }) => {
  await page.goto(`${process.env.E2E_TEST_SITE!}/blog/post-2`);

  const header = page.getByTestId("story-header");

  await expect(header.locator("h1")).toHaveCount(1);
  await expect(header.locator("h1").first()).toHaveText("Blog Post 2");

  // TODO
  // await expect(header.locator("p")).toContainText("Blog Post 2 Description");
});
