import { expect, test } from '../helpers/fixtures';

test.describe('RSS Feed', () => {
  test('serves a valid RSS feed at /rss.xml', async ({ page, basePath }) => {
    const response = await page.goto(`${basePath}/rss.xml`);

    expect(response).not.toBeNull();
    expect(response!.status()).toBe(200);
    expect(response!.headers()['content-type']).toContain(
      'application/rss+xml',
    );

    const body = await response!.text();

    await test.step('has valid RSS 2.0 structure', () => {
      expect(body).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(body).toContain('<rss version="2.0"');
      expect(body).toContain('<channel>');
      expect(body).toContain('</channel>');
    });

    await test.step('includes only pages with date frontmatter', () => {
      // Blog posts have date frontmatter and should be included
      expect(body).toContain('<title>First Blog Post</title>');
      expect(body).toContain('<title>Second Blog Post</title>');
      expect(body).toContain('<title>Third Blog Post</title>');

      // Pages without date frontmatter should be excluded
      expect(body).not.toContain('basic-syntax');
      expect(body).not.toContain('code-blocks');
    });

    await test.step('includes descriptions and authors', () => {
      expect(body).toContain(
        '<description>This is the first test blog post for e2e testing.</description>',
      );
      expect(body).toContain('<author>alice</author>');
    });

    await test.step('has atom self-link', () => {
      expect(body).toContain('rel="self"');
      expect(body).toContain('type="application/rss+xml"');
    });
  });

  test('RSS auto-discovery link is present in page head', async ({
    page,
    basePath,
  }) => {
    await page.goto(`${basePath}/blog/first-post`);

    const rssLink = page.locator('link[type="application/rss+xml"]');
    await expect(rssLink).toHaveCount(1);
    await expect(rssLink).toHaveAttribute('href', /rss\.xml/);
  });
});
