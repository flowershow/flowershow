import { expect, test } from '../_fixtures/published-site-test';
import { decodedImageSrc } from '../_utils/utils';

test.describe('Links and embeds', () => {
  test.beforeEach(async ({ publishedSitePage }) => {
    await publishedSitePage.goto('/syntax/links-and-embeds');
  });

  test.describe('Obsidian wiki-links', () => {
    test('Wiki-link with shortest path', async ({ publishedSitePage }) => {
      const link = publishedSitePage.page
        .getByRole('link', { name: 'post-1', exact: true })
        .first();
      await expect(link).toHaveAttribute(
        'href',
        `${publishedSitePage.siteUrlPath}/blog/post-1`,
      );
    });

    test('Wiki-link with absolute path', async ({ publishedSitePage }) => {
      const link = publishedSitePage.page.getByRole('link', {
        name: 'blog/post-1',
        exact: true,
      });
      await expect(link).toHaveAttribute(
        'href',
        `${publishedSitePage.siteUrlPath}/blog/post-1`,
      );
    });

    test('Wiki-link to root README', async ({ publishedSitePage }) => {
      const link = publishedSitePage.page
        .getByRole('link', { name: 'README', exact: true })
        .first();
      await expect(link).toHaveAttribute('href', '/');
    });

    test('Wiki-link to README in blog folder', async ({
      publishedSitePage,
    }) => {
      const link = publishedSitePage.page.getByRole('link', {
        name: 'blog/README',
        exact: true,
      });
      await expect(link).toHaveAttribute(
        'href',
        `${publishedSitePage.siteUrlPath}/blog`,
      );
    });

    test('Wiki-link to file with permalink', async ({ publishedSitePage }) => {
      const link = publishedSitePage.page.getByRole('link', {
        name: 'post-with-permalink',
        exact: true,
      });
      await expect(link).toHaveAttribute(
        'href',
        `${publishedSitePage.siteUrlPath}/different/url`,
      );
    });
  });

  test.describe('Obsidian embeds', () => {
    test.describe('Images', () => {
      test('Image embed with shortest path', async ({ publishedSitePage }) => {
        const embed = publishedSitePage.page.locator('img[alt="image"]');
        await embed.waitFor({ state: 'attached' });
        const src = await embed.getAttribute('src');
        expect(src).toContain('/_next/image');
        expect(decodedImageSrc(src!)).toBe(
          `${publishedSitePage.siteUrl}/assets/image.jpg`,
        );
      });

      test('Image embed with absolute path', async ({ publishedSitePage }) => {
        const embed = publishedSitePage.page
          .locator('img[alt="assets/image"]')
          .first();
        await embed.waitFor({ state: 'attached' });
        const src = await embed.getAttribute('src');
        expect(src).toContain('/_next/image');
        expect(decodedImageSrc(src!)).toBe(
          `${publishedSitePage.siteUrl}/assets/image.jpg`,
        );
      });
    });
  });

  test.describe('CommonMark links', () => {
    test('Absolute path link', async ({ publishedSitePage }) => {
      const link = publishedSitePage.page.getByRole('link', {
        name: '/blog/post-1',
        exact: true,
      });
      await expect(link).toHaveAttribute(
        'href',
        `${publishedSitePage.siteUrlPath}/blog/post-1`,
      );
    });

    test('Relative path link', async ({ publishedSitePage }) => {
      const link = publishedSitePage.page.getByRole('link', {
        name: 'syntax',
        exact: true,
      });
      await expect(link).toHaveAttribute(
        'href',
        `${publishedSitePage.siteUrlPath}/syntax/syntax`,
      );
    });

    test('Relative path link with dot-slash', async ({ publishedSitePage }) => {
      const link = publishedSitePage.page.getByRole('link', {
        name: './syntax',
        exact: true,
      });
      await expect(link).toHaveAttribute(
        'href',
        `${publishedSitePage.siteUrlPath}/syntax/syntax`,
      );
    });

    test('Link to root README with absolute path', async ({
      publishedSitePage,
    }) => {
      const link = publishedSitePage.page.getByRole('link', {
        name: '/README',
        exact: true,
      });
      await expect(link).toHaveAttribute('href', '/');
    });

    test('Link to parent directory README', async ({ publishedSitePage }) => {
      const link = publishedSitePage.page.getByRole('link', {
        name: '../README',
        exact: true,
      });
      await expect(link).toHaveAttribute('href', '/');
    });
  });

  test.describe('CommonMark embeds', () => {
    test('CommonMark image embed', async ({ publishedSitePage }) => {
      const embed = publishedSitePage.page.locator(
        'img[alt="/assets/image.jpg"]',
      );
      await embed.waitFor({ state: 'attached' });
      const src = await embed.getAttribute('src');
      expect(src).toContain('/_next/image');
      expect(decodedImageSrc(src!)).toBe(
        `${publishedSitePage.siteUrl}/assets/image.jpg`,
      );
    });
  });
});

test.describe('MDX', () => {
  test('Should resolve JSX href and src attributes', async ({
    publishedSitePage,
  }) => {
    await publishedSitePage.goto('/syntax/jsx-blocks');
    const embed = publishedSitePage.page.getByTestId('jsx-img').locator('img');
    const src = await embed.getAttribute('src');
    expect(src).toContain('/_next/image');
    expect(decodedImageSrc(src!)).toMatch(/\/@.+\/.+\/.+/);
  });

  test('MDX variables', async ({ publishedSitePage }) => {
    await publishedSitePage.goto('/syntax/mdx-variables');
    await expect(publishedSitePage.page.getByText('44 million')).toBeVisible();
    await expect(
      publishedSitePage.page.getByText('$119 trillion'),
    ).toBeVisible();
    await expect(publishedSitePage.page.getByText('46,000')).toBeVisible();
  });

  test('Frontmatter variables', async ({ publishedSitePage }) => {
    await publishedSitePage.goto('/syntax/frontmatter-variables');
    await expect(
      publishedSitePage.page.getByText('var1 equals 123'),
    ).toBeVisible();
  });
});
