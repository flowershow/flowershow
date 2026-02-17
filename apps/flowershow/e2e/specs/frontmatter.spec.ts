import { expect, test } from '@playwright/test';

const TEST_USER = process.env.GH_E2E_TEST_ACCOUNT || 'e2e-testuser';
const TEST_PROJECT = 'e2e-test-site';
const BASE_PATH = `/@${TEST_USER}/${TEST_PROJECT}`;

test.describe('Frontmatter & Blog Layout', () => {
  test('page title comes from frontmatter', async ({ page }) => {
    await page.goto(`${BASE_PATH}/frontmatter`);
    const header = page.locator('.page-header');
    await expect(header.locator('h1')).toHaveText('Post With Metadata');
  });

  test('description is displayed', async ({ page }) => {
    await page.goto(`${BASE_PATH}/frontmatter`);
    const header = page.locator('.page-header');
    await expect(header).toContainText('A post with full frontmatter metadata');
  });

  test('date is displayed and formatted', async ({ page }) => {
    await page.goto(`${BASE_PATH}/frontmatter`);
    const header = page.locator('.page-header');
    // formatDate uses en-US locale: "June 15, 2025"
    await expect(header).toContainText('June 15, 2025');
  });

  test('meta description tag is set from frontmatter', async ({ page }) => {
    await page.goto(`${BASE_PATH}/frontmatter`);
    const metaDesc = page.locator('meta[name="description"]');
    await expect(metaDesc).toHaveAttribute(
      'content',
      'A post with full frontmatter metadata',
    );
  });

  test('home page renders title from frontmatter', async ({ page }) => {
    await page.goto(`${BASE_PATH}`);
    const header = page.locator('.page-header');
    await expect(header.locator('h1')).toHaveText('Welcome to E2E Test Site');
  });
});
