import { expect, test } from '@playwright/test';
import { BASE_PATH } from '../helpers/seed';

test('non-existent page shows 404', async ({ page }) => {
  await page.goto(`${BASE_PATH}/this-page-does-not-exist`);
  const notFound = page.locator('.not-found');
  await expect(notFound).toBeVisible();
  await expect(notFound.locator('.not-found-title')).toHaveText('404');
  await expect(notFound.locator('.not-found-subtitle')).toHaveText(
    'Page Not Found',
  );
});

test('deeply nested non-existent page shows 404', async ({ page }) => {
  await page.goto(`${BASE_PATH}/a/b/c/d/nope`);
  const notFound = page.locator('.not-found');
  await expect(notFound).toBeVisible();
});
