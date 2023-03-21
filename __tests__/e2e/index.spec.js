// @ts-check
const { test, expect } = require('@playwright/test');

test('has title', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/Home/);
});

test('has blog posts index page', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('link', { name: /BLOG/ }).click();

  await expect(page).toHaveURL("/blog");
});
