import { expect, type Locator, test } from '../helpers/fixtures';

// toc-rail.md (and docs/toc-rail.md, under the sidebar) opt into
// `toc: { style: rail }` and have 8 h2 + 4 h3, so the rail draws 12 ticks.
// docs/getting-started.md keeps the default panel style and has 5 h2s.

const box = async (locator: Locator) => {
  const b = await locator.boundingBox();
  if (!b) throw new Error('element has no bounding box');
  return b;
};

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

test.describe('ToC rail on wide screens', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('rail replaces the panel, right of the text', async ({
    page,
    basePath,
  }) => {
    await page.goto(`${basePath}/toc-rail`);
    const rail = page.locator('nav.toc-rail');
    await expect(rail).toBeVisible();
    await expect(page.locator('nav.toc')).toHaveCount(0);
    await expect(rail.locator('.toc-rail-tick')).toHaveCount(12);
    await expect(page.locator('.toc-inline')).toHaveCount(1);
    await expect(page.locator('.toc-inline')).toBeHidden();

    const railBox = await box(rail);
    const textBox = await box(page.locator('#mdxpage'));
    expect(railBox.x).toBeGreaterThanOrEqual(textBox.x + textBox.width);
  });

  test('hovering opens the outline to the left', async ({ page, basePath }) => {
    await page.goto(`${basePath}/toc-rail`);
    const rail = page.locator('nav.toc-rail');
    const outline = rail.locator('.toc-rail-outline');
    await expect(outline).toBeHidden();

    await rail.hover();
    await expect(outline).toBeVisible();
    const outlineBox = await box(outline);
    const railBox = await box(rail);
    expect(outlineBox.x).toBeLessThan(railBox.x);
  });

  test('keyboard: focus opens, Tab enters, Escape closes', async ({
    page,
    basePath,
  }) => {
    await page.goto(`${basePath}/toc-rail`);
    const rail = page.locator('nav.toc-rail');
    const button = rail.locator('button.toc-rail-button');
    const outline = rail.locator('.toc-rail-outline');

    await button.focus();
    await expect(button).toHaveAttribute('aria-expanded', 'true');
    await expect(outline).toBeVisible();

    await page.keyboard.press('Tab');
    await expect(outline.locator('a').first()).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(outline).toBeHidden();
    await expect(button).toBeFocused();
    await expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  test('clicking an outline link jumps to its heading', async ({
    page,
    basePath,
  }) => {
    await page.goto(`${basePath}/toc-rail`);
    const rail = page.locator('nav.toc-rail');
    await rail.hover();
    const link = rail.locator('.toc-rail-outline a').nth(2);
    await expect(link).toBeVisible();
    const href = (await link.getAttribute('href')) ?? '';
    expect(href).toMatch(/^#.+/);

    await link.click();
    await expect(page).toHaveURL(new RegExp(`${escapeRegExp(href)}$`));
  });

  test('with a sidebar: sidebar left of the text, rail right', async ({
    page,
    basePath,
  }) => {
    await page.goto(`${basePath}/docs/toc-rail`);
    const sidebar = page.locator('.site-sidebar');
    const rail = page.locator('nav.toc-rail');
    await expect(sidebar).toBeVisible();
    await expect(rail).toBeVisible();

    const textBox = await box(page.locator('#mdxpage'));
    const sidebarBox = await box(sidebar);
    const railBox = await box(rail);
    expect(sidebarBox.x + sidebarBox.width).toBeLessThanOrEqual(textBox.x);
    expect(railBox.x).toBeGreaterThanOrEqual(textBox.x + textBox.width);
  });

  test('panel pages keep the panel (no regression)', async ({
    page,
    basePath,
  }) => {
    await page.goto(`${basePath}/docs/getting-started`);
    await expect(page.locator('nav.toc')).toBeVisible();
    await expect(page.locator('nav.toc-rail')).toHaveCount(0);
    await expect(page.locator('.toc-inline')).toHaveCount(1);
    await expect(page.locator('.toc-inline')).toBeHidden();
  });
});

test.describe('ToC rail between 1024px and 1280px', () => {
  test.use({ viewport: { width: 1100, height: 800 } });

  test('rail shows; the inline block does not', async ({ page, basePath }) => {
    await page.goto(`${basePath}/toc-rail`);
    await expect(page.locator('nav.toc-rail')).toBeVisible();
    await expect(page.locator('.toc-inline')).toHaveCount(1);
    await expect(page.locator('.toc-inline')).toBeHidden();
  });
});

test.describe('Inline contents on narrow screens', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('rail page: inline block instead of the rail', async ({
    page,
    basePath,
  }) => {
    await page.goto(`${basePath}/toc-rail`);
    await expect(page.locator('nav.toc-rail')).toBeHidden();

    const details = page.locator('details.toc-inline');
    await expect(details).toBeVisible();
    await expect(details).not.toHaveAttribute('open', /.*/);

    await details.locator('summary').click();
    await expect(details).toHaveAttribute('open', /.*/);

    const link = details.locator('a').nth(1);
    const href = (await link.getAttribute('href')) ?? '';
    expect(href).toMatch(/^#.+/);
    await link.click();
    await expect(details).not.toHaveAttribute('open', /.*/);
    await expect(page).toHaveURL(new RegExp(`${escapeRegExp(href)}$`));
  });

  test('panel page: inline block shows too', async ({ page, basePath }) => {
    await page.goto(`${basePath}/docs/getting-started`);
    await expect(page.locator('details.toc-inline')).toBeVisible();
  });
});
