import { expect, test } from '../helpers/fixtures';

// The site's `head` config (see fixtures/test-site/config.json) injects a
// verification <meta> and an inline <script> into every page's <head>. These
// tests cover the seam the unit tests can't reach: config.json `head` ->
// resolveSiteConfig -> public layout -> real SSR output and browser execution.
const HEAD_META_NAME = 'e2e-custom-head';
const HEAD_META_CONTENT = 'custom-head-verification-token';

test('Custom Head Code', async ({ page, basePath }) => {
  await test.step('verification <meta> is in the server-rendered <head> (crawler-visible on first load)', async () => {
    // Assert on the raw SSR HTML, before any hydration, so this proves the tag
    // is present for crawlers on first paint — not just added client-side.
    const response = await page.request.get(`${basePath}/frontmatter`);
    expect(response.ok()).toBeTruthy();
    const html = await response.text();
    expect(html).toContain(`name="${HEAD_META_NAME}"`);
    expect(html).toContain(`content="${HEAD_META_CONTENT}"`);
  });

  await page.goto(`${basePath}/frontmatter`);

  await test.step('the <meta> is present in the document head', async () => {
    await expect(
      page.locator(`meta[name="${HEAD_META_NAME}"]`),
    ).toHaveAttribute('content', HEAD_META_CONTENT);
  });

  await test.step('an inline <script> from the head executes in the browser', async () => {
    // The head script stamps <html data-custom-head-ran="true"> when it runs.
    await expect(page.locator('html')).toHaveAttribute(
      'data-custom-head-ran',
      'true',
    );
  });
});
