import { test, expect } from "@playwright/test";
import { testSite } from "./test-utils";

test("Wiki layout with frontmatter metadata", async ({ page }) => {
  await page.goto(`${testSite}/blog/post-1`);

  const header = page.getByTestId("wiki-header");

  await expect(header.locator("h1")).toHaveCount(1);
  await expect(header.locator("h1").first()).toHaveText("Blog Post 1");

  await expect(header.locator("p").nth(0)).toContainText("John Doe");
  await expect(header.locator("p").nth(1)).toContainText(
    "Blog Post 1 Description",
  );

  await expect(header.locator("time")).toContainText("June 6, 2024");
});

test("Wiki layout without frontmatter metadata", async ({ page }) => {
  await page.goto(`${testSite}/blog/post-2`);

  const header = page.getByTestId("wiki-header");

  await expect(header.locator("h1")).toHaveCount(1);
  await expect(header.locator("h1").first()).toHaveText("Blog Post 2");

  // TODO
  // await expect(header.locator("p")).toContainText("Blog Post 2 Description");
});
