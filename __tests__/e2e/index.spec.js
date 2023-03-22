// @ts-check
const { test, expect } = require('@playwright/test');


test.describe.parallel("Basics", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/_test/markdown');
  });

  test('has title', async ({ page }) => {
    await expect(page).toHaveTitle(/DataHub/);
  });

  test('has blog posts index page', async ({ page }) => {
    await page.getByRole('link', { name: /BLOG/ }).click();
    await expect(page).toHaveURL("/blog");
  });
});

test.describe.parallel("MDX features", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/_test/markdown');
  });

  test("simple expression", async ({ page }) => {
    await expect(page.locator("#simple-expression > p")).toContainText(/Two 🍰 is: 6.28/);
  });
});

