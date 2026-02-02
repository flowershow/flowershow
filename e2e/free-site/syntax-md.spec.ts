import { expect, test } from '../_fixtures/published-site-test';

test.describe('Links and embeds', () => {
  test.beforeEach(async ({ publishedSitePage }) => {
    await publishedSitePage.goto('/syntax/links-and-embeds-md');
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
      await expect(link).toHaveAttribute(
        'href',
        `${publishedSitePage.siteUrlPath}`,
      );
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

    test('Wiki-link with special characters', async ({ publishedSitePage }) => {
      const link = publishedSitePage.page
        .getByRole('link', {
          name: 'Post With.Special.Chars %&(1)',
          exact: true,
        })
        .first();
      await expect(link).toHaveAttribute(
        'href',
        `${publishedSitePage.siteUrlPath}/blog/Post+With.Special.Chars+%25%26(1)`,
      );
    });

    test('Wiki-link to heading on the same page', async ({
      publishedSitePage,
    }) => {
      const link = publishedSitePage.page.getByRole('link', {
        name: '#Obsidian embeds',
        exact: true,
      });
      await expect(link).toHaveAttribute('href', '#obsidian-embeds');
    });

    test('Wiki-link to heading on another page', async ({
      publishedSitePage,
    }) => {
      const link = publishedSitePage.page.getByRole('link', {
        name: 'syntax/syntax#Text Formatting',
        exact: true,
      });
      await expect(link).toHaveAttribute(
        'href',
        `${publishedSitePage.siteUrlPath}/syntax/syntax#text-formatting`,
      );
    });

    test('Wiki-link to asset', async ({ publishedSitePage }) => {
      const link = publishedSitePage.page.getByRole('link', {
        name: 'assets/sample.pdf',
        exact: true,
      });
      await expect(link).toHaveAttribute(
        'href',
        `${publishedSitePage.siteUrl}/assets/sample.pdf`,
      );
    });

    test('Wiki-link case insensitive', async ({ publishedSitePage }) => {
      const link = publishedSitePage.page.getByRole('link', {
        name: 'POST-1',
        exact: true,
      });
      await expect(link).toHaveAttribute(
        'href',
        `${publishedSitePage.siteUrlPath}/blog/post-1`,
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

    test('Wiki-link with alias', async ({ publishedSitePage }) => {
      const link = publishedSitePage.page.getByRole('link', {
        name: 'Some Alias',
        exact: true,
      });
      await expect(link).toHaveAttribute(
        'href',
        `${publishedSitePage.siteUrlPath}/blog/post-1`,
      );
    });
  });

  test.describe('Obsidian embeds', () => {
    test.describe('Images', () => {
      test('Image embed with shortest path', async ({ publishedSitePage }) => {
        const embed = publishedSitePage.page.locator('img[alt="image"]');
        const src = await embed.getAttribute('src');
        // expect(decodedImageSrc(src!)).toBe(
        //   `${publishedSitePage.siteUrl}/assets/image.jpg`,
        // );
        expect(src).toBe(`${publishedSitePage.siteUrl}/assets/image.jpg`);
      });

      test('Image embed with absolute path', async ({ publishedSitePage }) => {
        const embed = publishedSitePage.page
          .locator('img[alt="assets/image"]')
          .first();
        const src = await embed.getAttribute('src');
        // expect(decodedImageSrc(src!)).toBe(
        //   `${publishedSitePage.siteUrl}/assets/image.jpg`,
        // );
        expect(src).toBe(`${publishedSitePage.siteUrl}/assets/image.jpg`);
      });

      test('Image embed with special characters', async ({
        publishedSitePage,
      }) => {
        const embed = publishedSitePage.page.locator(
          'img[alt="Image With Special Chars %&(1)"]',
        );
        const src = await embed.getAttribute('src');
        // expect(decodedImageSrc(src!)).toBe(
        //   `${publishedSitePage.siteUrl}/assets/Image With Special Chars %&(1).jpg`,
        // );
        // expect(src).toBe(
        //   `${publishedSitePage.siteUrl}/assets/Image With Special Chars %&(1).jpg`,
        // );
        expect(src).toBe(
          `${publishedSitePage.siteUrl}/assets/Image%20With%20Special%20Chars%20%25%26(1).jpg`,
        );
      });

      test('Image embed with width and height', async ({
        publishedSitePage,
      }) => {
        const embed = publishedSitePage.page.locator(
          'img[alt="assets/image"][width="300"][height="200"]',
        );
        const src = await embed.getAttribute('src');
        // expect(decodedImageSrc(src!)).toBe(
        //   `${publishedSitePage.siteUrl}/assets/image.jpg`,
        // );
        expect(src).toBe(`${publishedSitePage.siteUrl}/assets/image.jpg`);
        await expect(embed).toHaveCSS('width', '300px');
        await expect(embed).toHaveCSS('height', '200px');
      });

      test('Image embed with width only', async ({ publishedSitePage }) => {
        const embed = publishedSitePage.page.locator(
          'img[alt="assets/image"][width="300"]:not([height])',
        );
        const src = await embed.getAttribute('src');
        // expect(decodedImageSrc(src!)).toBe(
        //   `${publishedSitePage.siteUrl}/assets/image.jpg`,
        // );
        expect(src).toBe(`${publishedSitePage.siteUrl}/assets/image.jpg`);
        await expect(embed).toHaveCSS('width', '300px');
      });
    });

    test('PDF embed', async ({ publishedSitePage }) => {
      await expect(
        publishedSitePage.page.locator('iframe[title="sample"]'),
      ).toBeVisible();
    });

    test('Video embed', async ({ publishedSitePage }) => {
      await expect(publishedSitePage.page.locator('video')).toHaveAttribute(
        'src',
        `${publishedSitePage.siteUrl}/assets/sample.mp4`,
      );
    });

    test('Audio embed', async ({ publishedSitePage }) => {
      await expect(publishedSitePage.page.locator('audio')).toHaveAttribute(
        'src',
        `${publishedSitePage.siteUrl}/assets/sample.mp3`,
      );
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
      await expect(link).toHaveAttribute(
        'href',
        `${publishedSitePage.siteUrlPath}`,
      );
    });

    test('Link to parent directory README', async ({ publishedSitePage }) => {
      const link = publishedSitePage.page.getByRole('link', {
        name: '../README',
        exact: true,
      });
      await expect(link).toHaveAttribute(
        'href',
        `${publishedSitePage.siteUrlPath}`,
      );
    });

    test('External link', async ({ publishedSitePage }) => {
      const link = publishedSitePage.page.getByRole('link', {
        name: 'External link',
        exact: true,
      });
      await expect(link).toHaveAttribute('href', 'https://example.com');
    });

    test('Link to heading', async ({ publishedSitePage }) => {
      const link = publishedSitePage.page.getByRole('link', {
        name: '#Links%20in%20JSX%20blocks',
        exact: true,
      });
      await expect(link).toHaveAttribute('href', '#links-in-jsx-blocks');
    });

    test('Link to asset', async ({ publishedSitePage }) => {
      const link = publishedSitePage.page.getByRole('link', {
        name: 'sample',
        exact: true,
      });
      await expect(link).toHaveAttribute(
        'href',
        `${publishedSitePage.siteUrl}/assets/sample.pdf`,
      );
    });

    test('Link with spaces in path', async ({ publishedSitePage }) => {
      const link = publishedSitePage.page.getByRole('link', {
        name: 'with spaces',
        exact: true,
      });
      await expect(link).toHaveAttribute(
        'href',
        `${publishedSitePage.siteUrlPath}/some/path/with+spaces`,
      );
    });

    test('Link with special characters', async ({ publishedSitePage }) => {
      const link = publishedSitePage.page.getByRole('link', {
        name: 'link',
        exact: true,
      });
      await expect(link).toHaveAttribute(
        'href',
        `${publishedSitePage.siteUrlPath}/blog/caf%C3%A9%26restaurant!`,
      );
    });
  });

  test.describe('CommonMark embeds', () => {
    test('CommonMark image embed', async ({ publishedSitePage }) => {
      const embed = publishedSitePage.page.locator(
        'img[alt="/assets/image.jpg"]',
      );
      const src = await embed.getAttribute('src');
      // expect(decodedImageSrc(src!)).toBe(
      //   `${publishedSitePage.siteUrl}/assets/image.jpg`,
      // );
      expect(src).toBe(`${publishedSitePage.siteUrl}/assets/image.jpg`);
    });

    test('CommonMark embed with width and height', async ({
      publishedSitePage,
    }) => {
      const embed = publishedSitePage.page.locator(
        'img[width="100"][height="200"]',
      );
      const src = await embed.getAttribute('src');
      // expect(decodedImageSrc(src!)).toBe(
      //   'https://publish-01.obsidian.md/access/f786db9fac45774fa4f0d8112e232d67/Attachments/Engelbart.jpg',
      // );
      expect(src).toBe(
        'https://publish-01.obsidian.md/access/f786db9fac45774fa4f0d8112e232d67/Attachments/Engelbart.jpg',
      );
      await expect(embed).toHaveCSS('width', '100px');
      await expect(embed).toHaveCSS('height', '200px');
    });

    test('CommonMark embed with width only', async ({ publishedSitePage }) => {
      const embed = publishedSitePage.page.locator(
        'img[width="150"]:not([height])',
      );
      const src = await embed.getAttribute('src');
      // expect(decodedImageSrc(src!)).toBe(
      //   'https://publish-01.obsidian.md/access/f786db9fac45774fa4f0d8112e232d67/Attachments/Engelbart.jpg',
      // );
      expect(src).toBe(
        'https://publish-01.obsidian.md/access/f786db9fac45774fa4f0d8112e232d67/Attachments/Engelbart.jpg',
      );
      await expect(embed).toHaveCSS('width', '150px');
    });
  });

  test('Table with wiki-links', async ({ publishedSitePage }) => {
    const table = publishedSitePage.page.locator('table');

    const firstLink = table.locator('a').nth(0);
    await expect(firstLink).toHaveText('post-1');
    await expect(firstLink).toHaveAttribute(
      'href',
      `${publishedSitePage.siteUrlPath}/blog/post-1`,
    );

    // const aliasLink = table.locator('a').nth(1);
    // await expect(aliasLink).toHaveText('Link with Alias');
    // await expect(aliasLink).toHaveAttribute(
    //   'href',
    //   `${publishedSitePage.siteUrlPath}/blog/post-1`,
    // );

    const specialCharsLink = table.locator('a').nth(2);
    await expect(specialCharsLink).toHaveText('Post With.Special.Chars %&(1)');
    await expect(specialCharsLink).toHaveAttribute(
      'href',
      `${publishedSitePage.siteUrlPath}/blog/Post+With.Special.Chars+%25%26(1)`,
    );
  });
});

test.describe('HTML blocks', () => {
  test.beforeEach(async ({ publishedSitePage }) => {
    await publishedSitePage.goto('/syntax/html-blocks');
  });

  test('Should resolve HTML img src paths', async ({ publishedSitePage }) => {
    const embed = publishedSitePage.page.getByTestId('html-img').locator('img');
    const src = await embed.getAttribute('src');
    expect(src).toMatch(/\/@.+\/.+\/.+/);
  });

  test('Should preserve HTML img attributes', async ({ publishedSitePage }) => {
    const embed = publishedSitePage.page.getByTestId('html-img').locator('img');
    await expect(embed).toHaveAttribute('alt', 'Image');
    await expect(embed).toHaveAttribute(
      'style',
      'float:right;margin:auto;width:200px',
    );
  });

  test('Should resolve HTML anchor href paths', async ({
    publishedSitePage,
  }) => {
    const link = publishedSitePage.page.getByTestId('html-link').locator('a');
    await expect(link).toHaveAttribute(
      'href',
      `${publishedSitePage.siteUrlPath}/blog/post-1`,
    );
  });

  test('Should preserve HTML anchor attributes', async ({
    publishedSitePage,
  }) => {
    const link = publishedSitePage.page.getByTestId('html-link').locator('a');
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    await expect(link).toHaveAttribute('class', 'custom-link');
  });
});
