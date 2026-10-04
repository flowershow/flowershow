import { expect, test } from '../helpers/fixtures';

test('page gets a generated social card and a computed description', async ({
  page,
  basePath,
  request,
}) => {
  await page.goto(`${basePath}/basic-syntax`);

  const ogImage = await page
    .locator('meta[property="og:image"]')
    .getAttribute('content');
  expect(
    ogImage,
    'og:image meta missing — is SOCIAL_CARDS_ENABLED=true?',
  ).not.toBeNull();
  expect(ogImage).toMatch(/\/_og\/basic-syntax\?v=[0-9a-f]{10}$/);
  await expect(page.locator('meta[name="twitter:creator"]')).toHaveCount(0);

  const description = await page
    .locator('meta[name="description"]')
    .getAttribute('content');
  expect(description).toBe(
    'This is a paragraph with bold text, italic text, and strikethrough text.',
  );
  // basic-syntax renders with the default (blog) layout header; the computed
  // description must not be repeated there.
  await expect(page.locator('.page-header-title')).toHaveText('Basic Syntax');
  await expect(page.locator('.page-header-description')).toHaveCount(0);

  const res = await request.get(ogImage as string);
  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toBe('image/png');
  expect(res.headers()['cache-control']).toBe(
    'public, max-age=31536000, immutable',
  );
});

test('unknown pages get the site card, not a 404', async ({
  page,
  basePath,
  request,
}) => {
  await page.goto(`${basePath}/`);
  const home = await page
    .locator('meta[property="og:image"]')
    .getAttribute('content');
  expect(
    home,
    'og:image meta missing — is SOCIAL_CARDS_ENABLED=true?',
  ).not.toBeNull();
  const missing = (home as string).replace(
    /\/_og(\?|$)/,
    '/_og/definitely-not-a-page$1',
  );
  const res = await request.get(missing);
  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toBe('image/png');
});
