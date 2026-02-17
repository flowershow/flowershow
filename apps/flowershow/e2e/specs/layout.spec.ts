import { expect, test } from '@playwright/test';
import { BASE_PATH } from '../helpers/seed';

test('Site Layout', async ({ page }) => {
  await page.goto(`${BASE_PATH}`);

  await test.step('nav bar is visible with site title', async () => {
    const nav = page.locator('nav.site-navbar');
    await expect(nav).toBeVisible();
    await expect(nav).toContainText('E2E Test Site');
  });

  await test.step('nav contains configured links', async () => {
    const nav = page.locator('nav.site-navbar');
    await expect(nav.locator('a', { hasText: 'Home' })).toBeVisible();
    await expect(nav.locator('a', { hasText: 'Syntax' })).toBeVisible();
  });

  await test.step('sidebar is visible', async () => {
    const sidebar = page.locator('.site-sidebar');
    await expect(sidebar).toBeVisible();
  });

  await test.step('sidebar contains links to pages', async () => {
    const sidebar = page.locator('.site-sidebar');
    const links = sidebar.locator('a');
    const count = await links.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  await test.step('footer is visible with configured content', async () => {
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
    await expect(footer).toContainText('Resources');
    await expect(footer.locator('a', { hasText: 'About' })).toBeVisible();
  });
});
