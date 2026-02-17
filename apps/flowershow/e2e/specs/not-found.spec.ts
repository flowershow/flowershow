import { expect, test } from '@playwright/test';

const TEST_USER = process.env.GH_E2E_TEST_ACCOUNT || 'e2e-testuser';
const TEST_PROJECT = 'e2e-test-site';
const BASE_PATH = `/@${TEST_USER}/${TEST_PROJECT}`;

test.describe('404 Not Found', () => {
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
});
