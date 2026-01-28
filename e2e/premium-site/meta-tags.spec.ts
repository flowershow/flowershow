import { expect, test } from '../_fixtures/published-site-test';

test.describe('Meta tags', () => {
  test('OpenGraph meta tags', async ({ publishedSitePage }) => {
    await publishedSitePage.goto('/blog/post-with-metadata');

    const ogTitle = await publishedSitePage.page
      .locator("meta[property='og:title']")
      .getAttribute('content');
    await expect(ogTitle).toBe('Blog Post 1 - Test site title');

    const ogDescription = await publishedSitePage.page
      .locator("meta[property='og:description']")
      .getAttribute('content');
    await expect(ogDescription).toBe('Blog Post 1 Description');

    const ogUrl = await publishedSitePage.page
      .locator("meta[property='og:url']")
      .getAttribute('content');
    await expect(ogUrl).toBe(
      `http://${publishedSitePage.domain}/blog/post-with-metadata`,
    );

    const ogImage = await publishedSitePage.page
      .locator("meta[property='og:image']")
      .getAttribute('content');
    await expect(ogImage).toBe(
      `http://${publishedSitePage.domain}/assets/image.jpg`,
    );

    const ogType = await publishedSitePage.page
      .locator("meta[property='og:type']")
      .getAttribute('content');
    await expect(ogType).toBe('website');
  });

  test('OpenGraph meta tags (default values)', async ({
    publishedSitePage,
  }) => {
    await publishedSitePage.goto('/blog/post-without-metadata');

    const ogTitle = await publishedSitePage.page
      .locator("meta[property='og:title']")
      .getAttribute('content');
    await expect(ogTitle).toBe('Blog Post 2 - Test site title');

    const ogDescription = await publishedSitePage.page
      .locator("meta[property='og:description']")
      .getAttribute('content');
    await expect(ogDescription).toBe('Test site description');

    const ogUrl = await publishedSitePage.page
      .locator("meta[property='og:url']")
      .getAttribute('content');
    await expect(ogUrl).toBe(
      `http://${publishedSitePage.domain}/blog/post-without-metadata`,
    );

    // TODO this in theory is required but we don't set it to default on premium sites
    // const ogImage = await publishedSitePage.page
    //   .locator("meta[property='og:image']")
    //   .getAttribute("content");
    // await expect(ogImage).toBe(
    //   "https://r2-assets.flowershow.app/thumbnail.png",
    // );

    const ogType = await publishedSitePage.page
      .locator("meta[property='og:type']")
      .getAttribute('content');
    await expect(ogType).toBe('website');
  });

  test('Favicon', async ({ publishedSitePage }) => {
    await publishedSitePage.goto('/');

    const favicon = await publishedSitePage.page
      .locator("link[rel='icon']")
      .getAttribute('href');
    await expect(favicon).toBe(
      'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🐶</text></svg>',
    );
  });
});
