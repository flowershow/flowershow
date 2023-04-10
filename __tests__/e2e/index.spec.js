// @ts-check
const { test, expect } = require("@playwright/test");

test.describe.parallel("Basics", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("has title", async ({ page }) => {
    await expect(page).toHaveTitle(/DataHub/);
  });

  test("has blog posts index page", async ({ page }) => {
    await page.getByRole("link", { name: /BLOG/ }).click();
    await expect(page).toHaveURL("/blog");
  });
});

test.describe.parallel("MDX features", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/markdown");
  });

  test("simple expression", async ({ page }) => {
    await expect(page.locator("#simple-expression > p")).toHaveText(
      /Two 🍰 is: 6.28/
    );
  });

  test("has access to list of backlinks", async ({ page }) => {
    const backlinks = page.locator("#backlinks > p");
    await expect(backlinks).toContainText("test/test");
    await expect(backlinks).toContainText("test/test2");
  });
});

test.describe.parallel("wiki links", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/markdown");
  });

  test("parses a wiki link", async ({ page }) => {
    const link = page.locator("#wiki-link > p > a");
    await link.click();
    await expect(page).toHaveURL("/example");
  });

  test("parses a wiki link with alias", async ({ page }) => {
    const link = page.locator("#wiki-link-alias > p > a");
    await expect(link).toContainText("Example with alias");
    await link.click();
    await expect(page).toHaveURL("/example");
  });

  // TODO
  // test("parses a wiki link with header", async ({ page }) => {
  //   const link = page.locator("#wiki-link-heading > p > a");
  //   await link.click();
  //   await expect(page).toHaveURL("/_test/example#abcd");
  // });

  // TODO
  test("link to image file", async ({ page }) => {
    const link = page.locator("#wiki-link-image > p > img");
    await expect(link).toHaveAttribute(
      "src",
      "Excalidraw/markdown-processing-pipeline-2023-02-23.excalidraw.svg"
    );
  });
});
