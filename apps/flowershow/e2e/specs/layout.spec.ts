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
    await expect(nav.locator('a', { hasText: 'About' })).toBeVisible();
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

    // Should not contain pages outside configured paths
    await expect(links.filter({ hasText: 'Basic Syntax' })).not.toBeVisible();
    await expect(
      links.filter({ hasText: 'Welcome to E2E Test Site' }),
    ).not.toBeVisible();
  });

  await test.step('sidebar hides paths listed in contentHide', async () => {
    await page.goto(`${basePath}/docs/getting-started`);
    const sidebar = page.locator('.site-sidebar');
    const links = sidebar.locator('a');

    // /docs/people is inside sidebar.paths ("/docs") but listed in
    // contentHide, so none of its entries should appear in the tree.
    await expect(links.filter({ hasText: 'Alice Johnson' })).not.toBeVisible();
    await expect(links.filter({ hasText: 'Bob Smith' })).not.toBeVisible();
    await expect(links.filter({ hasText: 'Carol Williams' })).not.toBeVisible();

    // The "People" directory itself should not appear
    await expect(
      sidebar.locator('button', { hasText: 'People' }),
    ).not.toBeVisible();

    // Non-hidden docs pages should still be present
    await expect(links.filter({ hasText: 'Getting Started' })).toBeVisible();
  });

  await test.step('hidden pages are still accessible directly', async () => {
    // contentHide only affects the sidebar tree and search, not page access
    await page.goto(`${basePath}/docs/people/alice`);
    await expect(page.locator('h1')).toHaveText('Alice Johnson');
  });

  await test.step('canvas file appears in sidebar with filename as label', async () => {
    await page.goto(`${basePath}/docs/getting-started`);
    const sidebar = page.locator('.site-sidebar');
    const links = sidebar.locator('a');

    // docs/some graph.canvas should be listed as "some graph.canvas"
    await expect(links.filter({ hasText: 'some graph.canvas' })).toBeVisible();
  });

  await test.step('html file appears in sidebar with filename as label', async () => {
    await page.goto(`${basePath}/docs/getting-started`);
    const sidebar = page.locator('.site-sidebar');
    const links = sidebar.locator('a');

    // docs/test.html should be listed as "test.html"
    await expect(links.filter({ hasText: 'test.html' })).toBeVisible();
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

test('layout: plain content spans the full page width', async ({
  page,
  basePath,
}) => {
  // Regression guard for the documented contract: plain-layout content has no
  // max-width, padding or margin, so authors never need a `100vw` breakout.
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`${basePath}/plain-full-width`);

  const plain = page.locator('#mdxpage.rendered-mdx.is-plain');
  await expect(plain).toBeVisible();

  await test.step('no width constraint, padding or margin on the content wrapper', async () => {
    await expect(plain).toHaveCSS('max-width', 'none');
    await expect(plain).toHaveCSS('padding-left', '0px');
    await expect(plain).toHaveCSS('padding-right', '0px');
    await expect(plain).toHaveCSS('margin-left', '0px');
    await expect(plain).toHaveCSS('margin-right', '0px');
  });

  await test.step('content and its blocks span the viewport', async () => {
    // Compare against clientWidth (viewport minus any classic scrollbar), not
    // innerWidth or 100vw, so this holds whether or not the browser reserves
    // space for a scrollbar. (Playwright runs Chromium with --hide-scrollbars,
    // so it can't reproduce the `100vw` scrollbar bug itself; it guards the
    // max-width/padding/margin contract.)
    const widths = await page.evaluate(() => {
      const root = document.documentElement;
      const content = document.querySelector('#mdxpage') as HTMLElement;
      const firstBlock = content.querySelector('p') as HTMLElement;
      return {
        clientWidth: root.clientWidth,
        contentScrollWidth: content.scrollWidth,
        contentClientWidth: content.clientWidth,
        contentLeft: content.getBoundingClientRect().left,
        contentWidth: content.getBoundingClientRect().width,
        blockWidth: firstBlock.getBoundingClientRect().width,
      };
    });

    expect(widths.contentLeft).toBe(0);
    expect(widths.contentWidth).toBe(widths.clientWidth);
    expect(widths.blockWidth).toBe(widths.clientWidth);
    // No horizontal overflow inside the plain content (scoped to #mdxpage so
    // unrelated chrome can't fail this test).
    expect(widths.contentScrollWidth).toBeLessThanOrEqual(
      widths.contentClientWidth,
    );
  });
});
