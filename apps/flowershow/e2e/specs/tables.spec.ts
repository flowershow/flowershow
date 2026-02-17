import { expect, test } from '@playwright/test';

const TEST_USER = process.env.GH_E2E_TEST_ACCOUNT || 'e2e-testuser';
const TEST_PROJECT = 'e2e-test-site';
const BASE_PATH = `/@${TEST_USER}/${TEST_PROJECT}`;

test.describe('Tables', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_PATH}/tables`);
  });

  test('renders GFM table as HTML table', async ({ page }) => {
    const content = page.locator('#mdxpage');
    await expect(content.locator('table')).toBeVisible();
  });

  test('table has correct header cells', async ({ page }) => {
    const content = page.locator('#mdxpage');
    const headers = content.locator('table thead th');
    await expect(headers).toHaveCount(3);
    await expect(headers.nth(0)).toHaveText('Name');
    await expect(headers.nth(1)).toHaveText('Age');
    await expect(headers.nth(2)).toHaveText('City');
  });

  test('table has correct data rows', async ({ page }) => {
    const content = page.locator('#mdxpage');
    const rows = content.locator('table tbody tr');
    await expect(rows).toHaveCount(3);
    await expect(rows.first().locator('td').first()).toHaveText('Alice');
    await expect(rows.last().locator('td').last()).toHaveText('Tokyo');
  });
});
