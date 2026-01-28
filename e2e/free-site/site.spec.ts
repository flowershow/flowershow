import { expect, test } from '../_fixtures/published-site-test';
import { decodedImageSrc } from '../_utils/utils';

test.describe('Site configuration in `config.json`', () => {
  test('Folders in `contentExclude` are not published', async ({
    publishedSitePage,
  }) => {
    const response = await publishedSitePage.goto(
      '/blog/archive/archived-post',
    );
    expect(response).not.toBeNull();
    expect(response!.status()).toBe(404);
    await expect(publishedSitePage.page.getByText('404')).toBeVisible();
  });

  test('Files in `contentExclude` are not published', async ({
    publishedSitePage,
  }) => {
    const response = await publishedSitePage.goto('/blog/draft-post');
    expect(response).not.toBeNull();
    expect(response!.status()).toBe(404);
    await expect(publishedSitePage.page.getByText('404')).toBeVisible();
  });

  test('File with `publish: false` is not published', async ({
    publishedSitePage,
  }) => {
    const response = await publishedSitePage.goto(
      '/blog/draft-post-with-publish-false',
    );
    expect(response).not.toBeNull();
    expect(response!.status()).toBe(404);
    await expect(publishedSitePage.page.getByText('404')).toBeVisible();
  });

  test('Should handle permanent redirects', async ({ publishedSitePage }) => {
    const [redirectResponse] = await Promise.all([
      publishedSitePage.page.waitForResponse(
        (res) => res.url().endsWith('/old-page') && res.status() === 308,
      ),
      publishedSitePage.goto('/old-page'),
    ]);
    expect(redirectResponse.status()).toBe(308);
    expect(redirectResponse.headers()['location']).toMatch(/\/new-page$/);
  });

  test('Should handle temporary redirects', async ({ publishedSitePage }) => {
    const [redirectResponse] = await Promise.all([
      publishedSitePage.page.waitForResponse(
        (res) => res.url().endsWith('/temp-old') && res.status() === 307,
      ),
      publishedSitePage.goto('/temp-old'),
    ]);
    expect(redirectResponse.status()).toBe(307);
    expect(redirectResponse.headers()['location']).toMatch(/\/temp-new$/);
  });
});

test.describe('Raw resource endpoints', () => {
  test('Should redirect to R2 and download the file if passed correct file path', async ({
    publishedSitePage,
  }) => {
    // const response = await request.get(`${testSite}/assets/image.jpg`);
    const response = await publishedSitePage.goto('/assets/image.jpg');
    expect(response).not.toBeNull();
    expect(response!.status()).toBe(200);
    expect(response!.headers()['content-type']).toBe('image/jpeg');
  });
});

test('Should display frontmatter metadata in the header correctly', async ({
  publishedSitePage,
}) => {
  await publishedSitePage.goto('/blog/post-with-metadata');

  const header = publishedSitePage.page.locator('header');
  await expect(header.locator('time').first()).toHaveText('January 1, 2026');
  await expect(header.locator('h1').first()).toHaveText('Blog Post 1');
  await expect(header).toContainText('Blog Post 1 Description');

  const authorLink = header.locator('.page-header-author-name').first();
  await expect(authorLink).toContainText('John Doe', { ignoreCase: true });
  await expect(authorLink).toHaveAttribute(
    'href',
    `${publishedSitePage.siteUrlPath}/team/john-doe`,
  );
  const authorAvatar = header.locator('.page-header-author-avatar').first();
  const authorAvatarSrc = await authorAvatar.getAttribute('src');
  expect(decodedImageSrc(authorAvatarSrc!)).toBe(
    `${publishedSitePage.siteUrl}/team/john.jpg`,
  );
});

test('Should use first h1 as title and display it in the header', async ({
  publishedSitePage,
}) => {
  await publishedSitePage.goto('/blog/post-without-metadata');

  const header = publishedSitePage.page.locator('.page-header');
  await expect(header.locator('h1').first()).toHaveText('Blog Post 2');
  const body = publishedSitePage.page.locator('.page-body');
  await expect(body.locator('h1').getByText('Blog Post 2')).toBeHidden();
});

test('Should render List component correctly', async ({
  publishedSitePage,
}) => {
  await publishedSitePage.goto('/blog');

  // Check that the list component is present
  const list = publishedSitePage.page.locator('.list-component');
  await expect(list).toBeVisible();

  // Check that there are exactly 3 list items displayed
  const listItems = list.locator('.list-component-item');
  await expect(listItems).toHaveCount(3);

  const blogPost1 = list.locator('.list-component-item ').first();
  // await expect(blogPost1.innerText).toBe("Blog Post 1");
  await expect(blogPost1.locator('a')).toHaveAttribute(
    'href',
    `${publishedSitePage.siteUrlPath}/blog/post-with-metadata`,
  );

  // Check that "Blog Home Page" is not present on page 1
  await expect(list.getByText('Blog Home Page')).not.toBeVisible();

  // Check that pagination is present
  const pagination = list.locator('.list-component-pagination');
  await expect(pagination).toBeVisible();

  // Check that there are 2 page buttons (for 2 pages)
  const pageButtons = pagination.locator(
    '.list-component-pagination-page-button',
  );
  await expect(pageButtons).toHaveCount(2);

  // Go to second page
  const nextButton = pagination.locator(
    '.list-component-pagination-button--next',
  );
  await nextButton.click();

  const listItems2 = list.locator('.list-component-item');
  await expect(listItems2).toHaveCount(3);
});

test.describe('Obsidian permalinks', () => {
  // test("Should handle permalink URL", async ({ publishedSitePage }) => {
  //   await publishedSitePage.goto("/different/url");
  //   expect(publishedSitePage.page).toHaveTitle("Post with permalink");
  // });

  test('Should redirect from original URL to permalink if set', async ({
    publishedSitePage,
  }) => {
    const [redirectResponse] = await Promise.all([
      publishedSitePage.page.waitForResponse(
        (res) =>
          res.url().endsWith('/blog/post-with-permalink') &&
          res.status() === 308,
      ),
      publishedSitePage.goto('/blog/post-with-permalink'),
    ]);
    expect(redirectResponse.status()).toBe(308);
    expect(redirectResponse.headers()['location']).toMatch(/\/different\/url$/);
  });
});
