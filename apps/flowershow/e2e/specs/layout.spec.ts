import { expect, test } from '../helpers/fixtures';

test('Site Layout', async ({ page, basePath }) => {
  await page.goto(`${basePath}`);

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

  await test.step('footer is visible with configured content', async () => {
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
    await expect(footer).toContainText('Resources');
    await expect(footer.locator('a', { hasText: 'About' })).toBeVisible();
  });
});

test('Sidebar', async ({ page, basePath }) => {
  await test.step('sidebar is visible on matching routes', async () => {
    await page.goto(`${basePath}/docs/getting-started`);
    const sidebar = page.locator('.site-sidebar');
    await expect(sidebar).toBeVisible();
  });

  await test.step('sidebar is hidden on non-matching routes', async () => {
    await page.goto(`${basePath}`);
    const sidebar = page.locator('.site-sidebar');
    await expect(sidebar).not.toBeVisible();
  });

  await test.step('sidebar flattens single configured path', async () => {
    await page.goto(`${basePath}/docs/getting-started`);
    const sidebar = page.locator('.site-sidebar');

    // With a single sidebar.paths entry ("/docs"), the "Docs" directory
    // wrapper should be removed and its children shown at root level.
    await expect(
      sidebar.locator('.site-tree > .site-tree-item > button.is-collapsible', {
        hasText: 'Docs',
      }),
    ).not.toBeVisible();
  });

  await test.step('sidebar only contains pages from matching routes', async () => {
    await page.goto(`${basePath}/docs/getting-started`);
    const sidebar = page.locator('.site-sidebar');
    const links = sidebar.locator('a');

    // Should contain docs pages
    await expect(links.filter({ hasText: 'Getting Started' })).toBeVisible();
    await expect(links.filter({ hasText: 'Configuration' })).toBeVisible();

    // Should not contain pages outside /docs
    await expect(links.filter({ hasText: 'Basic Syntax' })).not.toBeVisible();
    await expect(
      links.filter({ hasText: 'Welcome to E2E Test Site' }),
    ).not.toBeVisible();
  });

  await test.step('mobile sidebar subnav is visible on matching routes', async () => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(`${basePath}/docs/getting-started`);
    const subnav = page.locator('.site-subnav');
    await expect(subnav).toBeVisible();
  });

  await test.step('mobile sidebar subnav is hidden on non-matching routes', async () => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(`${basePath}`);
    const subnav = page.locator('.site-subnav');
    await expect(subnav).not.toBeVisible();
  });
});
