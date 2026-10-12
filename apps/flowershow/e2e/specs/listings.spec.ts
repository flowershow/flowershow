// List blocks and layout: list against the seeded listings demo site
// (e2e/fixtures/listings-demo). Every literal below comes from that fixture;
// check fixture changes first with `pnpm preview:listings:demo`.
import { encodeSlug } from '@flowershow/core';
import type { Page } from '@playwright/test';
import { filePathToSlug } from '../helpers/file-path-to-slug';
import { expect, test } from '../helpers/fixtures';

const items = (page: Page, root = 'section.list-component') =>
  page.locator(`${root} > article.list-component-item`);

test('zero-config blog folder (no README), page 1', async ({ page }) => {
  await page.goto('/blog');
  await expect(page).toHaveTitle(/^Blog/);
  await expect(page.locator('main h1').first()).toHaveText('Blog');
  await expect(page.locator('.layout-inner-left')).toHaveCount(0); // no sidebar, like the changelog fallback
  const list = page.locator('section.list-component.list-component--list');
  await expect(items(page)).toHaveCount(20);
  await expect(
    list.locator('.list-component-item-headline a').first(),
  ).toHaveText('Filename only post');
  await expect(page.getByText('Draft post')).toHaveCount(0);
  await expect(page.getByText('Unpublished post')).toHaveCount(0);
  await expect(list.locator('.heading-link')).toHaveCount(0);
  await expect(list.locator('h3[id]')).toHaveCount(0);
  const thumb = list.locator('img.list-component-item-media-img').first();
  await expect(thumb).toHaveAttribute('loading', 'lazy');
  // 160px thumbnails on desktop (next/image drops `sizes` when unoptimized, as in
  // dev and previews; the sizes value is pinned in lib/listing/render.test.ts)
  expect(
    (await list.locator('.list-component-item-media').first().boundingBox())
      ?.width,
  ).toBe(160);
  await expect(page.locator('.listing-page[data-view="list"]')).toBeVisible(); // one column for header, intro and list
  await expect(
    list.locator('.list-component-pagination-button--prev'),
  ).toHaveClass(/is-disabled/);
  await expect(
    list.locator('a.list-component-pagination-button--next[rel="next"]'),
  ).toHaveAttribute('href', '/blog?page=2');
  await expect(list.locator('[aria-current="page"]')).toHaveText('1');
});

test('zero-config blog folder, page 2, canonical and junk params', async ({
  page,
}) => {
  await page.goto('/blog?page=2&utm_source=x');
  await expect(items(page)).toHaveCount(8);
  await expect(
    page.locator('.list-component-item-headline a').last(),
  ).toHaveText('1984');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    /\/blog\?page=2$/,
  );
  await expect(
    page.locator('a.list-component-pagination-button--prev[rel="prev"]'),
  ).toHaveAttribute('href', '/blog');
  await expect(
    page.locator('.list-component-pagination-button--next'),
  ).toHaveClass(/is-disabled/);
  for (const a of await page.locator('nav.list-component-pagination a').all())
    await expect(a).not.toHaveAttribute('href', /utm_source/);
});

test('bad and out-of-range pages: past the last page is a 404, like the changelog', async ({
  page,
}) => {
  await page.goto('/blog?page=abc');
  await expect(items(page)).toHaveCount(20);
  expect((await page.goto('/blog?page=99'))?.status()).toBe(404);
  expect((await page.goto('/archive?page=99'))?.status()).toBe(404); // layout: list
  expect((await page.goto('/inline-paginated?page=99'))?.status()).toBe(404); // inline block
  expect((await page.goto('/inline-paginated?page=3'))?.status()).toBe(200);
});

test('a paginated inline block: pages 2+ are their own canonical', async ({
  page,
}) => {
  await page.goto('/inline-paginated?page=2');
  await expect(items(page)).toHaveCount(10);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    /\/inline-paginated\?page=2$/,
  );
  await page.goto('/limit-note?page=2'); // a limit block does not paginate
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    /\/limit-note$/,
  );
});

test('changelog index: a list block in an entry is a fixed first page with no page links', async ({
  page,
}) => {
  await page.goto('/changelog');
  const entry = page.locator('li.changelog-entry', {
    hasText: 'A reading list in a changelog entry',
  });
  await expect(entry.locator('section.list-component > article')).toHaveCount(
    2,
  );
  await expect(entry.locator('nav.list-component-pagination')).toHaveCount(0);
  // On the entry's own page the block paginates as usual
  await page.goto('/changelog/2026-09-02-reading-list');
  await expect(
    page.locator('a.list-component-pagination-button--next[rel="next"]'),
  ).toHaveAttribute('href', '/changelog/2026-09-02-reading-list?page=2');
});

test('authors resolve to people pages; unknown handles are plain text', async ({
  page,
}) => {
  await page.goto('/blog');
  await expect(
    page.locator('a.list-component-item-author[href="/people/ada"]').first(),
  ).toContainText('Ada Lovelace');
  // Avatars stack before the names: Ada's photo sits in the same authors group as her link
  await expect(
    page
      .locator(
        '.list-component-item-authors:has(a.list-component-item-author[href="/people/ada"]) img.list-component-item-author-avatar[src$="/people/assets/ada.jpg"]',
      )
      .first(),
  ).toBeVisible();
  await expect(
    page.locator('span.list-component-item-author', { hasText: 'nobody' }),
  ).toHaveCount(1);
});

test('home page: latest 3 and a featured-tag list; inline blocks have no aria-label and no page wrapper', async ({
  page,
}) => {
  await page.goto('/');
  const lists = page.locator('section.list-component');
  await expect(lists).toHaveCount(2);
  await expect(lists.nth(0).locator('> article')).toHaveCount(3);
  await expect(lists.nth(0).locator('nav')).toHaveCount(0);
  await expect(lists.nth(0)).not.toHaveAttribute('aria-label', /.+/);
  await expect(lists.nth(1).locator('> article')).toHaveCount(4); // posts 3, 10, 17 + odd-frontmatter
  await expect(lists.nth(1)).toHaveAttribute('data-media', 'none');
  await expect(page.locator('.listing-page')).toHaveCount(0);
});

test('projects grid: nested indexes, cards without images have no media, whole card clickable, full content width', async ({
  page,
}) => {
  await page.goto('/projects');
  const cards = page.locator('section.list-component--grid > article');
  await expect(cards.locator('.list-component-item-headline a')).toHaveText([
    'Beta',
    'Gamma',
    'Project Alpha',
  ]);
  await expect(
    cards
      .nth(0)
      .locator('.list-component-item-meta-value[data-field="status"]'),
  ).toHaveText('Shipped');
  await expect(cards.locator('time')).toHaveCount(0); // fields.date: none
  // Alpha has an image, so Beta and Gamma get a decorative monogram tile (all-or-nothing media)
  await expect(cards.locator('.list-component-item-media')).toHaveCount(3);
  await expect(
    cards.locator(
      '.list-component-item-media--placeholder[aria-hidden="true"] .list-component-item-monogram',
    ),
  ).toHaveText(['B', 'G']);
  await expect(
    cards.nth(2).locator('.list-component-item-media img'),
  ).toBeVisible();
  await expect(page.locator('.listing-page[data-view="grid"]')).toBeVisible();
  // A real click on the card's summary text: the card link's overlay takes it
  const summary = cards.nth(2).locator('.list-component-item-summary');
  await summary.scrollIntoViewIfNeeded();
  const box = (await summary.boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect(page).toHaveURL(/\/projects\/alpha$/);
});

test('thumbnail side: left by default, right with media: thumb right', async ({
  page,
}) => {
  await page.goto('/blog');
  const row = page
    .locator(
      'section.list-component[data-media-side="left"] > article:has(.list-component-item-media)',
    )
    .first();
  const media = await row.locator('.list-component-item-media').boundingBox();
  const title = await row
    .locator('.list-component-item-headline')
    .boundingBox();
  expect(media!.x).toBeLessThan(title!.x);
  await page.goto('/thumb-right');
  const r2 = page
    .locator(
      'section.list-component[data-media-side="right"] > article:has(.list-component-item-media)',
    )
    .first();
  const m2 = await r2.locator('.list-component-item-media').boundingBox();
  const t2 = await r2.locator('.list-component-item-headline').boundingBox();
  expect(m2!.x).toBeGreaterThan(t2!.x);
});

test('defaultImage fills cards without an image', async ({ page }) => {
  await page.goto('/default-image');
  const cards = page.locator('section.list-component--grid > article');
  await expect(cards).toHaveCount(3);
  await expect(cards.locator('.list-component-item-media img')).toHaveCount(3);
  await expect(cards.nth(0).locator('img')).toHaveAttribute(
    'src',
    /alpha-cover\.jpg$/,
  ); // Beta, via defaultImage
});

test('grid without monograms: defaultImage none, or no item with an image', async ({
  page,
}) => {
  await page.goto('/no-monogram');
  const cards = page.locator('section.list-component--grid > article');
  await expect(cards).toHaveCount(3);
  await expect(cards.locator('.list-component-item-media')).toHaveCount(1);
  await expect(page.locator('.list-component-item-monogram')).toHaveCount(0);
  await page.goto('/text-grid');
  await expect(
    page.locator('section.list-component--grid[data-media="none"] > article'),
  ).toHaveCount(3);
  await expect(page.locator('.list-component-item-media')).toHaveCount(0);
});

test('page-level listing: no empty ToC column, so the grid has 3 columns at 1280px; a page with its own headings keeps the ToC', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/projects');
  await expect(page.locator('section.list-component--grid')).toBeVisible();
  await expect(page.locator('.page-toc-container')).toHaveCount(0);
  const tops = await page
    .locator('section.list-component--grid > article')
    .evaluateAll((els) =>
      els.map((e) => Math.round(e.getBoundingClientRect().top)),
    );
  expect(new Set(tops).size).toBe(1); // Beta, Gamma, Alpha side by side
  await page.goto('/podcast');
  await expect(
    page.locator('.page-toc-container', { hasText: 'About the show' }),
  ).toBeVisible();
});

test('folder note with where, and wiki-linked custom fields', async ({
  page,
}) => {
  await page.goto('/podcast');
  await expect(items(page)).toHaveCount(2);
  await expect(
    page.locator(
      '.list-component-item-meta-value[data-field="guests"] a[href="/people/ada"]',
    ),
  ).toHaveText('Ada Lovelace');
  await expect(
    page.locator(
      'section.list-component[data-media="thumb"][data-ratio="1-1"]',
    ),
  ).toBeVisible();
});

test('compact archive: page-level, grouped by year, one ellipsis per gap', async ({
  page,
}) => {
  await page.goto('/archive');
  const root = page.locator('section.list-component--compact');
  await expect(root).toHaveAttribute('data-view', 'compact');
  await expect(root.locator('> h2.list-component-group-heading')).toHaveText([
    '2026',
  ]);
  await expect(page.locator('h2.list-component-group-heading[id]')).toHaveCount(
    0,
  );
  await expect(
    page.locator('.listing-page[data-view="compact"]'),
  ).toBeVisible();
  // date column + title, no images or summaries
  const rows = items(page);
  await expect(rows).toHaveCount(3);
  await expect(rows.first().locator('time')).toHaveText('Sep 1, 2026');
  await expect(root.locator('.list-component-item-media')).toHaveCount(0);
  await expect(root.locator('.list-component-item-summary')).toHaveCount(0);
  await expect(page.locator('.list-component-pagination-ellipsis')).toHaveCount(
    1,
  );
  await expect(page.locator('.list-component-pagination-pages > *')).toHaveText(
    ['1', '2', '3', '…', '10'],
  );
});

test('error cards are isolated and specific', async ({ page }) => {
  await page.goto('/errors');
  const card = page.locator('.list-component-error--block');
  await expect(card).toContainText(
    'No folder "posts-typo" with pages. Folders with pages:',
  );
  await expect(card).toContainText('Unknown key "perPage". Use "pageSize".');
  await expect(card).toContainText('Unknown key "image". Use "media: cover"');
  await expect(items(page)).toHaveCount(2);
  await page.goto('/two-paginated');
  await expect(page.locator('.list-component-error--block')).toContainText(
    'Only one list per page can paginate',
  );
});

test('prose-only posts/README gets the listing appended; ToC ignores items', async ({
  page,
}) => {
  await page.goto('/posts');
  await expect(page.locator('#mdxpage')).toContainText(
    'Shorter notes, collected here.',
  );
  await expect(items(page)).toHaveCount(3);
  await expect(
    page.locator('.list-component-item-headline a').first(),
  ).toHaveText('Third note');
  await expect(page.locator('#mdxpage > :last-child')).toHaveClass(
    /list-component/,
  ); // after the prose
  await expect(
    page.locator('.page-toc-container', { hasText: 'Third note' }),
  ).toHaveCount(0);
});

test('opt-out and nested zero-config folders', async ({ page }) => {
  await page.goto('/notes/blog');
  await expect(page.locator('#mdxpage')).toContainText(
    'Nothing is listed here on purpose.',
  );
  await expect(page.locator('section.list-component')).toHaveCount(0);
  await page.goto('/notes/posts');
  await expect(items(page)).toHaveCount(1);
});

test('paths with spaces and non-ASCII link to the encoded appPath (Review Focus 3)', async ({
  page,
}) => {
  await page.goto('/blog');
  const href = encodeSlug(filePathToSlug('blog/2026/nested post ü.md'));
  const link = page.locator(
    `a.list-component-item-headline-link[href="${href}"]`,
  );
  await expect(link).toHaveText('Nested post ü');
  await link.click();
  await expect(page.locator('main h1').first()).toHaveText('Nested post ü'); // resolves, not a 404
});

test('limit with pageSize renders normally; the note is invisible (data attribute only)', async ({
  page,
}) => {
  await page.goto('/limit-note');
  await expect(page.locator('section.list-component')).toHaveAttribute(
    'data-listing-notes',
    /"pageSize" is ignored/,
  );
  await expect(page.getByText('is ignored')).toHaveCount(0);
  await expect(items(page)).toHaveCount(2);
});

test('folder note beside blog/ gets the listing (zero-config case 3, UX M-3)', async ({
  page,
}) => {
  await page.goto('/writing/blog');
  await expect(page.locator('#mdxpage')).toContainText('Essays, collected.');
  await expect(page.locator('.list-component-item-headline a')).toHaveText([
    'Essay two',
    'Essay one',
  ]);
});

test('folder note beside a capitalised Blog/ folder; a %% commented-out %% fence does not opt out (Review Focus 1)', async ({
  page,
}) => {
  await page.goto('/garden/blog');
  await expect(page.locator('#mdxpage')).toContainText(
    'An Obsidian folder note beside a capitalised Blog/ folder.',
  );
  await expect(page.locator('section.list-component')).toHaveCount(1);
  await expect(page.locator('.list-component-item-headline a')).toHaveText([
    'Compost',
    'Tomatoes',
  ]);
});

test('MDX: a listing fence inside a JSX element is the only listing (no zero-config second list)', async ({
  page,
}) => {
  await page.goto('/jsx/blog');
  await expect(page.locator('#mdxpage')).toContainText('inside a JSX element');
  await expect(items(page)).toHaveCount(1); // MDX inline blocks render after hydration; auto-waits
  await expect(page.locator('section.list-component')).toHaveCount(1);
  await expect(page.locator('.listing-page')).toHaveCount(0);
});

test('page-level listings are in the initial HTML, even on an .mdx page (tech M6)', async ({
  request,
}) => {
  for (const url of ['/blog', '/mdx/posts', '/projects']) {
    const html = await (await request.get(url)).text();
    expect(html, url).toContain('list-component-item-headline');
  }
});

test('drafts: reachable, noindex, not in the sitemap, tag pages or search listings', async ({
  page,
  request,
}) => {
  await page.goto('/blog/draft-post');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    'content',
    /noindex/,
  );
  const sitemap = await (await request.get('/sitemap.xml')).text();
  expect(sitemap).not.toContain('draft-post');
  await page.goto('/tags/featured');
  await expect(page.locator('main')).toContainText('Post 03');
  await expect(page.getByText('Draft post')).toHaveCount(0);
});

test('sitemap: generated README-less listing pages are listed', async ({
  request,
}) => {
  const sitemap = await (await request.get('/sitemap.xml')).text();
  expect(sitemap).toMatch(/<loc>[^<]*\/blog<\/loc>/);
  expect(sitemap).toMatch(/<loc>[^<]*\/notes\/posts<\/loc>/);
  expect(sitemap.match(/<loc>https?:\/\/[^/<]+\/posts<\/loc>/g)).toHaveLength(
    1,
  ); // posts/README.md is a page: listed once, not again as a generated one
});

test('case-insensitive folder, nested blocks, MDX page', async ({ page }) => {
  await page.goto('/case');
  await expect(items(page)).toHaveCount(2);
  await page.goto('/nested');
  await expect(page.locator('section.list-component')).toHaveCount(2);
  await page.goto('/mdx-page');
  await expect(items(page)).toHaveCount(3); // inline block in MDX: rendered after hydration; auto-waits
});

test('RSS excludes drafts', async ({ request }) => {
  const xml = await (await request.get('/rss.xml')).text();
  expect(xml).toContain('Post 25');
  expect(xml).not.toContain('Draft post');
});

test('compact inline teaser: no year headings, a category column', async ({
  page,
}) => {
  await page.goto('/compact-teaser');
  const root = page.locator('section.list-component--compact');
  await expect(root.locator('> article')).toHaveCount(3);
  await expect(root.locator('.list-component-group-heading')).toHaveCount(0);
  await expect(
    root.locator('.list-component-item-meta-value[data-field="category"]'),
  ).toHaveText(['Gardening']);
  // the date and the title share a row (a grid, not stacked lines)
  const row = root.locator('> article').first();
  const date = (await row.locator('time').boundingBox())!;
  const title = (await row
    .locator('.list-component-item-headline a')
    .boundingBox())!;
  expect(title.x).toBeGreaterThan(date.x + date.width);
  expect(Math.abs(title.y - date.y)).toBeLessThan(12);
});

test('grouping: by month, out of the ToC; each team heading once', async ({
  page,
}) => {
  await page.goto('/by-month');
  await expect(page.locator('h2.list-component-group-heading')).toHaveText([
    'September 2026',
    'August 2026',
    'July 2026',
    'June 2026',
  ]);
  await expect(
    page.locator('.page-toc-container', { hasText: '2026' }),
  ).toHaveCount(0);
  await page.goto('/team');
  await expect(page.locator('h2.list-component-group-heading')).toHaveText([
    'Design',
    'Eng',
  ]);
  // grouped first, then by name within the group
  await expect(
    page.locator(
      'section.list-component--people > article .list-component-item-headline a',
    ),
  ).toHaveText(['Bob Baker', 'Ann Archer', 'Cat Cole']);
});

test('people view: portraits, initials without one, role, title sort; a file in from is an error', async ({
  page,
}) => {
  await page.goto('/people');
  const root = page.locator('section.list-component--people');
  await expect(root).toHaveAttribute('data-ratio', '1-1');
  const cards = root.locator('> article');
  await expect(cards.locator('.list-component-item-headline a')).toHaveText([
    'Ada Lovelace',
    'Grace Hopper',
    'Katherine Johnson',
  ]);
  await expect(
    cards.nth(0).locator('.list-component-item-meta-value[data-field="role"]'),
  ).toHaveText('Mathematician');
  await expect(
    cards.nth(0).locator('.list-component-item-media img'),
  ).toBeVisible();
  await expect(
    cards
      .nth(2)
      .locator(
        '.list-component-item-media--placeholder[aria-hidden="true"] .list-component-item-initials',
      ),
  ).toHaveText('KJ');
  // the initials tile is the same size as a portrait
  const photo = (await cards
    .nth(0)
    .locator('.list-component-item-media')
    .boundingBox())!;
  const tile = (await cards
    .nth(2)
    .locator('.list-component-item-media')
    .boundingBox())!;
  expect(Math.round(tile.width)).toBe(Math.round(photo.width));
  expect(Math.round(tile.height)).toBe(Math.round(photo.height));
  await page.goto('/team-file');
  await expect(page.locator('.list-component-error--block')).toContainText(
    '"from" must be a folder',
  );
});

test('magazine = grid + featured: the featured: true post is the hero, once', async ({
  page,
}) => {
  await page.goto('/magazine');
  const cards = page.locator('section.list-component--grid > article');
  await expect(cards).toHaveCount(7);
  const hero = cards.first();
  await expect(hero).toHaveClass(/list-component-item--featured/);
  await expect(hero.locator('.list-component-item-headline a')).toHaveText(
    /^Post 10:/,
  );
  await expect(hero.locator('.list-component-item-eyebrow')).toHaveText(
    'Compilers',
  );
  await expect(hero.locator('.list-component-item-monogram')).toHaveCount(0);
  await expect(
    page.locator('.list-component-item-headline a', { hasText: /^Post 10:/ }),
  ).toHaveCount(1);
  await expect(page.locator('.list-component-item--featured')).toHaveCount(1);
});

test('an inline featured block keeps its hero on ?page=2 of its page', async ({
  page,
}) => {
  await page.goto('/magazine?page=2');
  const hero = page.locator('.list-component-item--featured');
  await expect(hero).toHaveCount(1);
  await expect(hero.locator('.list-component-item-headline a')).toHaveText(
    /^Post 10:/,
  );
  await expect(hero.locator('.list-component-item-media img')).toHaveAttribute(
    'loading',
    'eager',
  );
});

test('people view on an .mdx page', async ({ page }) => {
  await page.goto('/mdx-people');
  const cards = page.locator('section.list-component--people > article');
  await expect(cards.locator('.list-component-item-headline a')).toHaveText([
    'Ada Lovelace',
    'Grace Hopper',
    'Katherine Johnson',
  ]);
  await expect(
    cards.nth(2).locator('.list-component-item-initials'),
  ).toHaveText('KJ');
});

test('featured without a featured: true item promotes the latest; no image gives a text hero', async ({
  page,
}) => {
  await page.goto('/latest-hero');
  const rows = items(page);
  await expect(rows.locator('.list-component-item-headline a')).toHaveText([
    'Episode 2',
    'Episode 1',
  ]);
  await expect(rows.first()).toHaveClass(/list-component-item--featured/);
  await expect(rows.first().locator('.list-component-item-media')).toHaveCount(
    0,
  );
});
