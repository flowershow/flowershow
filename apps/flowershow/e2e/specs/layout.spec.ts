import { expect, test } from '@playwright/test';

const TEST_USER = process.env.GH_E2E_TEST_ACCOUNT || 'e2e-testuser';
const TEST_PROJECT = 'e2e-test-site';
const BASE_PATH = `/@${TEST_USER}/${TEST_PROJECT}`;

test.describe('Site Layout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_PATH}`);
  });

  test('nav bar is visible with site title', async ({ page }) => {
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();
    await expect(nav).toContainText('E2E Test Site');
  });

  test('nav contains configured links', async ({ page }) => {
    const nav = page.locator('nav');
    await expect(nav.locator('a', { hasText: 'Home' })).toBeVisible();
    await expect(nav.locator('a', { hasText: 'Syntax' })).toBeVisible();
  });

  test('sidebar is visible (showSidebar: true in config)', async ({ page }) => {
    const sidebar = page.locator('.site-sidebar');
    await expect(sidebar).toBeVisible();
  });

  test('sidebar contains links to pages', async ({ page }) => {
    const sidebar = page.locator('.site-sidebar');
    // Should have links for the fixture pages
    const links = sidebar.locator('a');
    const count = await links.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('footer is visible with configured content', async ({ page }) => {
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
    await expect(footer).toContainText('Resources');
    await expect(footer.locator('a', { hasText: 'About' })).toBeVisible();
  });
});
