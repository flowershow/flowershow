import { expect, test } from '../helpers/fixtures';

test('Tag index lists every tag with a page count', async ({
  page,
  basePath,
}) => {
  await page.goto(`${basePath}/tags`);

  await expect(page.locator('.tags-page-title')).toHaveText('Tags');

  const filmItem = page
    .locator('.tag-index-item')
    .filter({ has: page.locator('a.tag-pill', { hasText: '#film' }) });
  await expect(filmItem.locator('a.tag-pill')).toHaveAttribute(
    'href',
    `${basePath}/tags/film`,
  );
  // Two pages carry #film (tags-alpha via frontmatter, tags-beta via inline).
  await expect(filmItem.locator('.tag-index-count')).toHaveText('2');

  await expect(
    page.locator('a.tag-pill', { hasText: '#project/alpha' }),
  ).toBeVisible();
  await expect(
    page.locator('a.tag-pill', { hasText: '#project/beta' }),
  ).toBeVisible();
});

test('Per-tag page lists pages carrying the tag, newest first', async ({
  page,
  basePath,
}) => {
  await page.goto(`${basePath}/tags/film`);

  await expect(page.locator('.tags-page-title')).toHaveText('#film');

  const items = page.locator('.tag-page-list-item');
  await expect(items).toHaveCount(2);
  // Sorted by date descending: Tags Beta (2024-03) before Tags Alpha (2024-01).
  await expect(items.nth(0)).toContainText('Tags Beta');
  await expect(items.nth(1)).toContainText('Tags Alpha');
});

test('Parent tag page includes nested descendants', async ({
  page,
  basePath,
}) => {
  await page.goto(`${basePath}/tags/project`);

  const items = page.locator('.tag-page-list-item');
  // `project` surfaces both `project/alpha` and `project/beta`.
  await expect(items).toHaveCount(2);
  await expect(page.locator('.tag-page-list')).toContainText('Tags Alpha');
  await expect(page.locator('.tag-page-list')).toContainText('Tags Beta');
});

test('An empty tag page renders a sensible empty state, not a 404', async ({
  page,
  basePath,
}) => {
  const res = await page.goto(`${basePath}/tags/nonexistent`);
  expect(res?.status()).toBe(200);
  await expect(page.locator('.tags-page-title')).toHaveText('#nonexistent');
  await expect(page.locator('.tag-page-list-item')).toHaveCount(0);
});

test('A real page at /tags/... wins over the virtual tag page', async ({
  page,
  basePath,
}) => {
  await page.goto(`${basePath}/tags/book`);

  // The real page's content renders — not a tag listing.
  await expect(page.locator('.page-header-title')).toHaveText(
    'Real Tags Book Page',
  );
  await expect(page.locator('#mdxpage')).toContainText(
    'This is a real page whose slug is',
  );
  await expect(page.locator('.tag-page-list-item')).toHaveCount(0);
});

test('Frontmatter tags render as pills in the page header', async ({
  page,
  basePath,
}) => {
  await page.goto(`${basePath}/tags-alpha`);

  const headerTags = page.locator('.page-header-tags');
  await expect(
    headerTags.locator('a.tag-pill', { hasText: '#film' }),
  ).toHaveAttribute('href', `${basePath}/tags/film`);
  await expect(
    headerTags.locator('a.tag-pill', { hasText: '#project/alpha' }),
  ).toHaveAttribute('href', `${basePath}/tags/project/alpha`);
});

test('Inline body #tags render as pills in the prose', async ({
  page,
  basePath,
}) => {
  await page.goto(`${basePath}/tags-beta`);

  const body = page.locator('#mdxpage');
  await expect(
    body.locator('a.tag-pill', { hasText: '#film' }),
  ).toHaveAttribute('href', `${basePath}/tags/film`);
  await expect(
    body.locator('a.tag-pill', { hasText: '#project/beta' }),
  ).toHaveAttribute('href', `${basePath}/tags/project/beta`);
});

test('Tag pill colours default to pink and follow --color-tag-pill-* overrides', async ({
  page,
  basePath,
}) => {
  const setTheme = (mode: 'light' | 'dark') =>
    page.evaluate(
      (m) => document.documentElement.setAttribute('data-theme', m),
      mode,
    );

  await page.goto(`${basePath}/tags-beta`);
  // Inline pill inside rendered prose (exercises the `.rendered-mdx a.tag-pill`
  // override path).
  const inlinePill = page
    .locator('#mdxpage a.tag-pill', { hasText: '#film' })
    .first();

  await test.step('defaults are unchanged (light)', async () => {
    await setTheme('light');
    await expect(inlinePill).toHaveCSS('color', 'rgb(219, 39, 119)');
    await expect(inlinePill).toHaveCSS(
      'background-color',
      'rgba(219, 39, 119, 0.1)',
    );
  });

  await test.step('defaults are unchanged (dark)', async () => {
    await setTheme('dark');
    await expect(inlinePill).toHaveCSS('color', 'rgb(244, 114, 182)');
    await expect(inlinePill).toHaveCSS(
      'background-color',
      'rgba(244, 114, 182, 0.12)',
    );
  });

  // A site's custom.css is plain, unlayered CSS: a bare `:root` override must
  // beat the defaults in both modes without !important.
  await page.addStyleTag({
    content:
      ':root { --color-tag-pill-text: rgb(1, 2, 3); --color-tag-pill-bg: rgb(4, 5, 6); }',
  });

  await test.step('a :root override wins in dark mode', async () => {
    await setTheme('dark');
    await expect(inlinePill).toHaveCSS('color', 'rgb(1, 2, 3)');
    await expect(inlinePill).toHaveCSS('background-color', 'rgb(4, 5, 6)');
  });

  await test.step('a :root override wins in light mode', async () => {
    await setTheme('light');
    await expect(inlinePill).toHaveCSS('color', 'rgb(1, 2, 3)');
    await expect(inlinePill).toHaveCSS('background-color', 'rgb(4, 5, 6)');
  });

  await test.step('frontmatter header pills use the same tokens', async () => {
    await page.goto(`${basePath}/tags-alpha`);
    await page.addStyleTag({
      content: ':root { --color-tag-pill-text: rgb(1, 2, 3); }',
    });
    await expect(
      page.locator('.page-header-tags a.tag-pill').first(),
    ).toHaveCSS('color', 'rgb(1, 2, 3)');
  });
});
