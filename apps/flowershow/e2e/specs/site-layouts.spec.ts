import type { Page } from '@playwright/test';
import { expect, type Locator, test } from '../helpers/fixtures';

// docs/reading/*: essay.md (`layout: reading`, 5 h2s), with-sidebar.md (the
// same plus `showSidebar: true`) and few-headings.md (`layout: reading`, 2 h2s).
// They sit under /docs, the fixture's only sidebar path, so they have site
// contents. docs/toc-rail.md stays on the default `docs` layout.

const box = async (locator: Locator) => {
  const b = await locator.boundingBox();
  if (!b) throw new Error('element has no bounding box');
  return b;
};

const expectTextCentred = async (page: Page) => {
  const text = await box(page.locator('#mdxpage'));
  const viewport = page.viewportSize();
  if (!viewport) throw new Error('no viewport');
  expect(Math.abs(text.x + text.width / 2 - viewport.width / 2)).toBeLessThan(
    24,
  );
};

test.describe('Reading layout on wide screens', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('essay: menu button and rail left of the text, no sidebar', async ({
    page,
    basePath,
  }) => {
    await page.goto(`${basePath}/docs/reading/essay`);
    await expect(page.locator('.layout-inner')).toHaveClass(
      'layout-inner layout-reading',
    );
    await expect(page.locator('.site-sidebar')).toBeHidden();

    const rail = page.locator('nav.toc-rail');
    const menu = page.locator('.site-contents-menu-button');
    await expect(rail).toBeVisible();
    await expect(rail).toHaveAttribute('data-side', 'left');
    await expect(menu).toBeVisible();

    const railBox = await box(rail);
    const menuBox = await box(menu);
    const textBox = await box(page.locator('#mdxpage'));
    expect(railBox.x + railBox.width).toBeLessThanOrEqual(textBox.x);
    expect(menuBox.y + menuBox.height).toBeLessThanOrEqual(railBox.y);
    await expectTextCentred(page);
  });

  test('essay: hovering the rail opens the outline to the right', async ({
    page,
    basePath,
  }) => {
    await page.goto(`${basePath}/docs/reading/essay`);
    const rail = page.locator('nav.toc-rail');
    const outline = rail.locator('.toc-rail-outline');
    await expect(outline).toBeHidden();

    await rail.hover();
    await expect(outline).toBeVisible();
    const outlineBox = await box(outline);
    const railBox = await box(rail);
    expect(outlineBox.x).toBeGreaterThan(railBox.x);
  });

  test('essay: the menu button opens the site contents', async ({
    page,
    basePath,
  }) => {
    await page.goto(`${basePath}/docs/reading/essay`);
    const menu = page.locator('.site-contents-menu-button');
    await expect(menu).toHaveAttribute('aria-haspopup', 'dialog');
    await menu.click();

    const drawer = page.getByRole('dialog', { name: 'Site contents' });
    // The dialog root has no box of its own; its panel is position: fixed
    await expect(drawer.locator('.sidebar-drawer-panel')).toBeVisible();
    await expect(
      drawer.locator('.site-tree a', { hasText: 'Getting Started' }),
    ).toBeVisible();
  });

  test('essay: previous and next pages from the site tree', async ({
    page,
    basePath,
  }) => {
    await page.goto(`${basePath}/docs/reading/essay`);
    const nav = page.getByRole('navigation', {
      name: 'Previous and next pages',
    });
    await expect(nav).toBeVisible();
    await expect(nav.locator('.post-nav-link--prev')).toBeVisible();
    await expect(nav.locator('.post-nav-link--next')).toBeVisible();
  });

  test('essay: rail and menu button stay in view on scroll', async ({
    page,
    basePath,
  }) => {
    await page.goto(`${basePath}/docs/reading/essay`);
    const rail = page.locator('nav.toc-rail');
    const menu = page.locator('.site-contents-menu-button');
    await expect(rail).toBeVisible();

    await page.evaluate(() => window.scrollBy(0, 800));
    await expect
      .poll(() => page.evaluate(() => window.scrollY))
      .toBeGreaterThan(500);
    await expect(rail).toBeInViewport();
    await expect(menu).toBeInViewport();
  });

  test('with-sidebar: sidebar back, rail right of the text, no menu', async ({
    page,
    basePath,
  }) => {
    await page.goto(`${basePath}/docs/reading/with-sidebar`);
    const sidebar = page.locator('.site-sidebar');
    const rail = page.locator('nav.toc-rail');
    await expect(sidebar).toBeVisible();
    await expect(rail).toBeVisible();
    await expect(page.locator('.site-contents-menu-button')).toHaveCount(0);
    await expect(page.locator('.layout-inner')).not.toHaveClass(
      /layout-reading/,
    );

    const textBox = await box(page.locator('#mdxpage'));
    const railBox = await box(rail);
    expect(railBox.x).toBeGreaterThanOrEqual(textBox.x + textBox.width);
  });

  test('few-headings: no rail, text centred', async ({ page, basePath }) => {
    await page.goto(`${basePath}/docs/reading/few-headings`);
    await expect(page.locator('.layout-inner')).toHaveClass(
      'layout-inner layout-reading',
    );
    await expect(page.locator('nav.toc-rail')).toHaveCount(0);
    await expectTextCentred(page);
  });

  test('docs page keeps the sidebar and right rail', async ({
    page,
    basePath,
  }) => {
    await page.goto(`${basePath}/docs/toc-rail`);
    await expect(page.locator('.layout-inner')).toHaveClass(
      'layout-inner has-sidebar-and-toc is-toc-rail',
    );
    await expect(page.locator('.site-contents-menu-button')).toHaveCount(0);
    await expect(
      page.getByRole('navigation', { name: 'Previous and next pages' }),
    ).toHaveCount(0);
  });
});

test.describe('Reading layout on phones', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('essay: closed Contents block and subnav, no rail', async ({
    page,
    basePath,
  }) => {
    await page.goto(`${basePath}/docs/reading/essay`);
    await expect(page.locator('nav.toc-rail')).toBeHidden();
    await expect(page.locator('.site-contents-menu-button')).toBeHidden();

    const details = page.locator('details.toc-inline');
    await expect(details).toBeVisible();
    await expect(details).not.toHaveAttribute('open', /.*/);
    await expect(page.locator('.site-subnav-menu-button')).toBeVisible();
  });
});
