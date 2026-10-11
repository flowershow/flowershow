// Post pages (PR F) against the seeded listings demo site
// (e2e/fixtures/listings-demo/post-demo). post-demo/blog/ is a zero-config
// blog folder; newest first: Zeta, Epsilon, Delta (layout: page), Gamma, Beta
// (MDX), Alpha.
import { expect, test } from '../helpers/fixtures';

test('a Markdown post: header, hero, tags, previous/next, read more', async ({
  page,
}) => {
  await page.goto('/post-demo/blog/alpha');
  const article = page.locator('main article.post-page[data-layout="post"]');
  await expect(article).toBeVisible();
  const header = article.locator('header.page-header.post-header');
  await expect(header.locator('nav.post-eyebrow')).toContainText('Blog');
  await expect(header.locator('nav.post-eyebrow a')).toHaveAttribute(
    'href',
    '/post-demo/blog',
  );
  await expect(header.locator('nav.post-eyebrow')).not.toContainText(
    'Alpha post',
  );
  await expect(header.locator('h1.page-header-title')).toHaveText('Alpha post');
  await expect(header.locator('.post-dek')).toHaveText(
    'The oldest post in the post-page demo.',
  );
  await expect(header.locator('.post-byline-names')).toHaveText('Ada Lovelace');
  await expect(header.locator('.post-byline time')).toHaveAttribute(
    'datetime',
    '2026-01-10',
  );
  await expect(header.locator('.post-byline time')).toHaveText(
    'January 10, 2026',
  );
  await expect(header.locator('.post-hero img.post-hero-img')).toBeVisible();
  await expect(header.locator('.post-hero-caption')).toHaveText(
    'Dunes at dusk.',
  );
  await expect(
    article.locator('footer.post-footer a.tag-pill', { hasText: '#garden' }),
  ).toBeVisible();
  // the header no longer carries the tags
  await expect(header.locator('.tag-pill')).toHaveCount(0);

  // Alpha is the oldest: no previous, next is Beta
  const nav = page.locator('nav.post-nav');
  await expect(nav.locator('.post-nav-link--prev')).toHaveCount(0);
  await expect(nav.locator('a.post-nav-link--next')).toHaveAttribute(
    'href',
    '/post-demo/blog/beta',
  );
  await expect(nav.locator('.post-nav-link--next .post-nav-title')).toHaveText(
    'Beta post in MDX',
  );

  // Read more: three grid cards, the other garden post first, never Alpha
  const more = page.locator('main section.post-read-more');
  await expect(more.locator('h2.post-read-more-title')).toHaveText('Read more');
  const cards = more.locator(
    'section.list-component--grid > article.list-component-item',
  );
  await expect(cards).toHaveCount(3);
  await expect(
    cards.locator('.list-component-item-headline a').first(),
  ).toHaveText('Zeta post');
  await expect(more.getByText('Alpha post')).toHaveCount(0);
  await expect(more.locator('h3[id]')).toHaveCount(0);
  await expect(more.locator('.heading-link')).toHaveCount(0);
  // the ToC lists the post's own heading, never the read-more cards
  await expect(
    page.locator('.page-toc-container', { hasText: 'Zeta post' }),
  ).toHaveCount(0);
});

test('an MDX post gets the same layout; previous is older, next is newer', async ({
  page,
}) => {
  await page.goto('/post-demo/blog/beta');
  await expect(page.locator('#mdxpage .mdx-marker')).toHaveText(
    'Rendered from MDX.',
  );
  await expect(page.locator('article.post-page h1')).toHaveText(
    'Beta post in MDX',
  );
  await expect(page.locator('.post-byline-names')).toHaveText(
    'Ada Lovelace and Grace Hopper',
  );
  await expect(page.locator('.post-byline-avatar')).toHaveCount(2);
  await expect(page.locator('a.post-nav-link--prev')).toHaveAttribute(
    'href',
    '/post-demo/blog/alpha',
  );
  await expect(page.locator('a.post-nav-link--next')).toHaveAttribute(
    'href',
    '/post-demo/blog/gamma',
  );
  await expect(
    page.locator('section.post-read-more article.list-component-item'),
  ).toHaveCount(3);
});

test('no hero when the body already shows the image', async ({ page }) => {
  await page.goto('/post-demo/blog/gamma');
  await expect(page.locator('article.post-page')).toBeVisible();
  await expect(page.locator('.post-hero')).toHaveCount(0);
  await expect(page.locator('#mdxpage img')).toHaveCount(1);
});

test('layout: page opts a post out; it stays listed', async ({ page }) => {
  await page.goto('/post-demo/blog/delta');
  await expect(page.locator('main .page-header-title')).toHaveText(
    'Delta page',
  );
  await expect(page.locator('article.post-page')).toHaveCount(0);
  await expect(page.locator('.post-layout')).toHaveCount(0);
  await page.goto('/post-demo/blog');
  await expect(
    page.locator('.list-component-item-headline a', { hasText: 'Delta page' }),
  ).toBeVisible();
});

test('catalogue items and ordinary pages keep the page layout', async ({
  page,
}) => {
  await page.goto('/post-demo/catalog/item');
  await expect(page.locator('main .page-header-title')).toHaveText(
    'Catalog item',
  );
  await expect(page.locator('article.post-page')).toHaveCount(0);
  await page.goto('/people/ada');
  await expect(page.locator('article.post-page')).toHaveCount(0);
});

test('layout: post outside a collection: header only, no footer', async ({
  page,
}) => {
  await page.goto('/post-demo/standalone');
  await expect(page.locator('article.post-page h1')).toHaveText(
    'Standalone post',
  );
  await expect(page.locator('nav.post-nav')).toHaveCount(0);
  await expect(page.locator('section.post-read-more')).toHaveCount(0);
});

test('the blog index itself is a listing, not a post', async ({ page }) => {
  await page.goto('/post-demo/blog');
  await expect(page.locator('article.post-page')).toHaveCount(0);
  await expect(
    page.locator('section.list-component--list > article'),
  ).toHaveCount(6);
});
