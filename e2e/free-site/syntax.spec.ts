import { expect, test } from '../_fixtures/published-site-test';

test.describe('Links and embeds', () => {
  test.beforeEach(async ({ publishedSitePage }) => {
    await publishedSitePage.goto('/syntax/links-and-embeds');
  });

  test.describe('Obsidian wiki-links', () => {
    test('Wiki-link with shortest path', async ({ publishedSitePage }) => {
      const wikiLink = publishedSitePage.page
        .getByTestId('obsidian-wiki-link-shortest')
        .locator('a');
      await expect(wikiLink).toHaveText('post-1');
      await expect(wikiLink).toHaveAttribute(
        'href',
        `${publishedSitePage.siteUrlPath}/blog/post-1`,
      );
    });

    test('Wiki-link with absolute path', async ({ publishedSitePage }) => {
      const wikiLinkAbsolute = publishedSitePage.page
        .getByTestId('obsidian-wiki-link-absolute')
        .locator('a');
      await expect(wikiLinkAbsolute).toHaveText('blog/post-1');
      await expect(wikiLinkAbsolute).toHaveAttribute(
        'href',
        `${publishedSitePage.siteUrlPath}/blog/post-1`,
      );
    });

    test('Wiki-link to root README', async ({ publishedSitePage }) => {
      const wikiLinkRootReadme = publishedSitePage.page
        .getByTestId('obsidian-wiki-link-root-readme')
        .locator('a');
      await expect(wikiLinkRootReadme).toHaveText('README');
      await expect(wikiLinkRootReadme).toHaveAttribute(
        'href',
        `${publishedSitePage.siteUrlPath}`,
      );
    });

    test('Wiki-link to README in blog folder', async ({
      publishedSitePage,
    }) => {
      const wikiLinkBlogReadme = publishedSitePage.page
        .getByTestId('obsidian-wiki-link-blog-readme')
        .locator('a');
      await expect(wikiLinkBlogReadme).toHaveText('blog/README');
      await expect(wikiLinkBlogReadme).toHaveAttribute(
        'href',
        `${publishedSitePage.siteUrlPath}/blog`,
      );
    });

    test('Wiki-link with special characters', async ({ publishedSitePage }) => {
      const wikiLinkSpecialChars = publishedSitePage.page
        .getByTestId('obsidian-wiki-link-special-chars')
        .locator('a');
      await expect(wikiLinkSpecialChars).toHaveText(
        'Post With.Special.Chars %&(1)',
      );
      await expect(wikiLinkSpecialChars).toHaveAttribute(
        'href',
        `${publishedSitePage.siteUrlPath}/blog/Post+With.Special.Chars+%25%26(1)`,
      );
    });

    test('Wiki-link to heading on the same page', async ({
      publishedSitePage,
    }) => {
      const wikiLinkHeading = publishedSitePage.page
        .getByTestId('obsidian-wiki-link-heading-same-page')
        .locator('a');
      await expect(wikiLinkHeading).toHaveText('#Obsidian embeds');
      await expect(wikiLinkHeading).toHaveAttribute('href', `#obsidian-embeds`);
    });

    test('Wiki-link to heading on another page', async ({
      publishedSitePage,
    }) => {
      const wikiLinkHeading = publishedSitePage.page
        .getByTestId('obsidian-wiki-link-heading-another-page')
        .locator('a');
      await expect(wikiLinkHeading).toHaveText('syntax/syntax#Text Formatting');
      await expect(wikiLinkHeading).toHaveAttribute(
        'href',
        `${publishedSitePage.siteUrlPath}/syntax/syntax#text-formatting`,
      );
    });

    test('Wiki-link to asset', async ({ publishedSitePage }) => {
      const wikiLinkAsset = publishedSitePage.page
        .getByTestId('obsidian-wiki-link-asset')
        .locator('a');
      await expect(wikiLinkAsset).toHaveText('assets/sample.pdf');
      await expect(wikiLinkAsset).toHaveAttribute(
        'href',
        `${publishedSitePage.siteUrl}/assets/sample.pdf`,
      );
    });

    test('Wiki-link case insensitive', async ({ publishedSitePage }) => {
      const wikiLinkCase = publishedSitePage.page
        .getByTestId('obsidian-wiki-link-case')
        .locator('a');
      await expect(wikiLinkCase).toHaveText('POST-1');
      await expect(wikiLinkCase).toHaveAttribute(
        'href',
        `${publishedSitePage.siteUrlPath}/blog/post-1`,
      );
    });

    test('Wiki-link to file with permalink', async ({ publishedSitePage }) => {
      const wikiLinkPermalink = publishedSitePage.page
        .getByTestId('obsidian-wiki-link-file-with-permalink')
        .locator('a');
      await expect(wikiLinkPermalink).toHaveText('post-with-permalink');
      await expect(wikiLinkPermalink).toHaveAttribute(
        'href',
        `${publishedSitePage.siteUrlPath}/different/url`,
      );
    });

    test('Wiki-link with alias', async ({ publishedSitePage }) => {
      const wikiLinkAlias = publishedSitePage.page
        .getByTestId('obsidian-wiki-link-alias')
        .locator('a');
      await expect(wikiLinkAlias).toHaveText('Some Alias');
      await expect(wikiLinkAlias).toHaveAttribute(
        'href',
        `${publishedSitePage.siteUrlPath}/blog/post-1`,
      );
    });
  });

  test.describe('Obsidian embeds', () => {
    test.describe('Images', () => {
      test('Image embed with shortest path', async ({ publishedSitePage }) => {
        const embed = publishedSitePage.page
          .getByTestId('obsidian-embed-shortest')
          .locator('img');
        await embed.waitFor({ state: 'attached' });
        const src = await embed.getAttribute('src');
        const decoded = decodeURIComponent(
          new URL(src!, 'http://localhost').searchParams.get('url')!,
        );
        expect(decoded).toBe(`${publishedSitePage.siteUrl}/assets/image.jpg`);
      });

      test('Image embed with absolute path', async ({ publishedSitePage }) => {
        const embed = publishedSitePage.page
          .getByTestId('obsidian-embed-absolute')
          .locator('img');
        await embed.waitFor({ state: 'attached' });
        const src = await embed.getAttribute('src');
        const decoded = decodeURIComponent(
          new URL(src!, 'http://localhost').searchParams.get('url')!,
        );
        expect(decoded).toBe(`${publishedSitePage.siteUrl}/assets/image.jpg`);
      });

      test('Image embed with special characters', async ({
        publishedSitePage,
      }) => {
        const embed = publishedSitePage.page
          .getByTestId('obsidian-embed-special-chars')
          .locator('img');
        await embed.waitFor({ state: 'attached' });
        const src = await embed.getAttribute('src');
        const decoded = decodeURIComponent(
          new URL(src!, 'http://localhost').searchParams.get('url')!,
        );
        expect(decoded).toBe(
          `${publishedSitePage.siteUrl}/assets/Image With Special Chars %&(1).jpg`,
        );
      });

      test('Image embed with width and height', async ({
        publishedSitePage,
      }) => {
        const embed = publishedSitePage.page
          .getByTestId('obsidian-embed-width-and-height')
          .locator('img');
        await embed.waitFor({ state: 'attached' });
        const src = await embed.getAttribute('src');
        const decoded = decodeURIComponent(
          new URL(src!, 'http://localhost').searchParams.get('url')!,
        );
        expect(decoded).toBe(`${publishedSitePage.siteUrl}/assets/image.jpg`);
        await expect(embed).toHaveAttribute('width', '300');
        await expect(embed).toHaveAttribute('height', '200');
        await expect(embed).toHaveCSS('width', '300px');
        await expect(embed).toHaveCSS('height', '200px');
      });

      test('Image embed with width only', async ({ publishedSitePage }) => {
        const embed = publishedSitePage.page
          .getByTestId('obsidian-embed-width-only')
          .locator('img');
        await embed.waitFor({ state: 'attached' });
        const src = await embed.getAttribute('src');
        const decoded = decodeURIComponent(
          new URL(src!, 'http://localhost').searchParams.get('url')!,
        );
        expect(decoded).toBe(`${publishedSitePage.siteUrl}/assets/image.jpg`);
        await expect(embed).toHaveAttribute('width', '300');
        await expect(embed).toHaveCSS('width', '300px');
      });
    });

    // Markdown
    // test("PDF embed", async ({ publishedSitePage }) => {
    //   const pdfEmbed = publishedSitePage.page
    //     .getByTestId("obsidian-embed-pdf")
    //     .locator("iframe");
    //   await expect(pdfEmbed).toHaveAttribute(
    //     "src",
    //     `${publishedSitePage.siteUrl}/assets/sample.pdf`
    //   );
    // });

    // MDX
    test('PDF embed', async ({ publishedSitePage }) => {
      const pdfEmbed = publishedSitePage.page
        .getByTestId('obsidian-embed-pdf')
        .locator('.pdf-viewer');

      await expect(pdfEmbed).toBeVisible();
    });

    test('Video embed', async ({ publishedSitePage }) => {
      const videoEmbed = publishedSitePage.page
        .getByTestId('obsidian-embed-video')
        .locator('video');
      await expect(videoEmbed).toHaveAttribute(
        'src',
        `${publishedSitePage.siteUrl}/assets/sample.mp4`,
      );
    });

    test('Audio embed', async ({ publishedSitePage }) => {
      const audioEmbed = publishedSitePage.page
        .getByTestId('obsidian-embed-audio')
        .locator('audio');
      await expect(audioEmbed).toHaveAttribute(
        'src',
        `${publishedSitePage.siteUrl}/assets/sample.mp3`,
      );
    });
  });

  test.describe('CommonMark links', () => {
    test('Absolute path link', async ({ publishedSitePage }) => {
      const absoluteLink = publishedSitePage.page
        .getByTestId('common-mark-link-absolute')
        .locator('a');
      await expect(absoluteLink).toHaveText('/blog/post-1');
      await expect(absoluteLink).toHaveAttribute(
        'href',
        `${publishedSitePage.siteUrlPath}/blog/post-1`,
      );
    });

    test('Relative path link', async ({ publishedSitePage }) => {
      const relativeLink = publishedSitePage.page
        .getByTestId('common-mark-link-relative')
        .locator('a');
      await expect(relativeLink).toHaveText('syntax');
      await expect(relativeLink).toHaveAttribute(
        'href',
        `${publishedSitePage.siteUrlPath}/syntax/syntax`,
      );
    });

    test('Relative path link with dot-slash', async ({ publishedSitePage }) => {
      const relativeLinkDotSlash = publishedSitePage.page
        .getByTestId('common-mark-link-relative-dot-slash')
        .locator('a');
      await expect(relativeLinkDotSlash).toHaveText('./syntax');
      await expect(relativeLinkDotSlash).toHaveAttribute(
        'href',
        `${publishedSitePage.siteUrlPath}/syntax/syntax`,
      );
    });

    test('Link to root README with absolute path', async ({
      publishedSitePage,
    }) => {
      const rootReadmeLink = publishedSitePage.page
        .getByTestId('common-mark-link-root-readme-absolute')
        .locator('a');
      await expect(rootReadmeLink).toHaveText('/README');
      await expect(rootReadmeLink).toHaveAttribute(
        'href',
        `${publishedSitePage.siteUrlPath}`,
      );
    });

    test('Link to parent directory README', async ({ publishedSitePage }) => {
      const parentReadmeLink = publishedSitePage.page
        .getByTestId('common-mark-link-parent-readme')
        .locator('a');
      await expect(parentReadmeLink).toHaveText('../README');
      await expect(parentReadmeLink).toHaveAttribute(
        'href',
        `${publishedSitePage.siteUrlPath}`,
      );
    });

    test('External link', async ({ publishedSitePage }) => {
      const externalLink = publishedSitePage.page
        .getByTestId('common-mark-link-external')
        .locator('a');
      await expect(externalLink).toHaveText('External link');
      await expect(externalLink).toHaveAttribute('href', 'https://example.com');
    });

    test('Link to heading', async ({ publishedSitePage }) => {
      const headingLink = publishedSitePage.page
        .getByTestId('common-mark-link-heading')
        .locator('a');
      await expect(headingLink).toHaveText('#Links%20in%20JSX%20blocks');
      await expect(headingLink).toHaveAttribute('href', '#links-in-jsx-blocks');
    });

    test('Link to asset', async ({ publishedSitePage }) => {
      const assetLink = publishedSitePage.page
        .getByTestId('common-mark-link-asset')
        .locator('a');
      await expect(assetLink).toHaveText('sample');
      await expect(assetLink).toHaveAttribute(
        'href',
        `${publishedSitePage.siteUrl}/assets/sample.pdf`,
      );
    });

    test('Link with spaces in path', async ({ publishedSitePage }) => {
      const linkWithSpaces = publishedSitePage.page
        .getByTestId('common-mark-link-with-spaces')
        .locator('a');
      await expect(linkWithSpaces).toHaveText('with spaces');
      await expect(linkWithSpaces).toHaveAttribute(
        'href',
        `${publishedSitePage.siteUrlPath}/some/path/with+spaces`,
      );
    });

    test('Link with special characters', async ({ publishedSitePage }) => {
      const linkSpecialChars = publishedSitePage.page
        .getByTestId('common-mark-link-special-chars')
        .locator('a');
      await expect(linkSpecialChars).toHaveText('link');
      await expect(linkSpecialChars).toHaveAttribute(
        'href',
        `${publishedSitePage.siteUrlPath}/blog/caf%C3%A9%26restaurant!`,
      );
    });
  });

  test.describe('CommonMark embeds', () => {
    test('CommonMark image embed', async ({ publishedSitePage }) => {
      const embed = publishedSitePage.page
        .getByTestId('common-mark-embed')
        .locator('img');
      await embed.waitFor({ state: 'attached' });
      const src = await embed.getAttribute('src');
      const decoded = decodeURIComponent(
        new URL(src!, 'http://localhost').searchParams.get('url')!,
      );
      expect(decoded).toBe(`${publishedSitePage.siteUrl}/assets/image.jpg`);
    });

    test('CommonMark embed with width and height', async ({
      publishedSitePage,
    }) => {
      const embed = publishedSitePage.page
        .getByTestId('common-mark-embed-width-and-height')
        .locator('img');
      await embed.waitFor({ state: 'attached' });
      const src = await embed.getAttribute('src');
      const decoded = decodeURIComponent(
        new URL(src!, 'http://localhost').searchParams.get('url')!,
      );
      expect(decoded).toBe(
        'https://publish-01.obsidian.md/access/f786db9fac45774fa4f0d8112e232d67/Attachments/Engelbart.jpg',
      );
      await expect(embed).toHaveAttribute('width', '100');
      await expect(embed).toHaveAttribute('height', '200');
      await expect(embed).toHaveCSS('width', '100px');
      await expect(embed).toHaveCSS('height', '200px');
    });

    test('CommonMark embed with width only', async ({ publishedSitePage }) => {
      const embed = publishedSitePage.page
        .getByTestId('common-mark-embed-width-only')
        .locator('img');
      await embed.waitFor({ state: 'attached' });
      const src = await embed.getAttribute('src');
      const decoded = decodeURIComponent(
        new URL(src!, 'http://localhost').searchParams.get('url')!,
      );
      expect(decoded).toBe(
        'https://publish-01.obsidian.md/access/f786db9fac45774fa4f0d8112e232d67/Attachments/Engelbart.jpg',
      );
      await expect(embed).toHaveAttribute('width', '150');
      await expect(embed).toHaveCSS('width', '150px');
    });
  });

  test('Table with wiki-links', async ({ publishedSitePage }) => {
    const table = publishedSitePage.page.getByTestId('table-with-wiki-links');

    // Check first wiki-link in table
    const firstLink = table.locator('a').nth(0);
    await expect(firstLink).toHaveText('post-1');
    await expect(firstLink).toHaveAttribute(
      'href',
      `${publishedSitePage.siteUrlPath}/blog/post-1`,
    );

    // Check wiki-link with alias in table
    const aliasLink = table.locator('a').nth(1);
    await expect(aliasLink).toHaveText('Link with Alias');
    await expect(aliasLink).toHaveAttribute(
      'href',
      `${publishedSitePage.siteUrlPath}/blog/post-1`,
    );

    // Check wiki-link with special characters in table
    const specialCharsLink = table.locator('a').nth(2);
    await expect(specialCharsLink).toHaveText('Post With.Special.Chars %&(1)');
    await expect(specialCharsLink).toHaveAttribute(
      'href',
      `${publishedSitePage.siteUrlPath}/blog/Post+With.Special.Chars+%25%26(1)`,
    );
  });
});

test.describe('MDX', () => {
  test('Should resolve JSX href and src attributes', async ({
    publishedSitePage,
  }) => {
    await publishedSitePage.goto('/syntax/jsx');
    await expect(
      publishedSitePage.page.getByTestId('jsx-img').locator('img'),
    ).toHaveAttribute('src', /\/@.+\/.+\/.+/);
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

test.describe('HTML blocks', () => {
  test('Should resolve HTML href and src paths', async ({
    publishedSitePage,
  }) => {
    await publishedSitePage.goto('/syntax/html-blocks');
    const embed = publishedSitePage.page.getByTestId('html-img').locator('img');
    await embed.waitFor({ state: 'attached' });
    const src = await embed.getAttribute('src');
    const decoded = decodeURIComponent(
      new URL(src!, 'http://localhost').searchParams.get('url')!,
    );
    expect(decoded).toMatch(/\/@.+\/.+\/.+/);
  });
});

test.describe('Blog', () => {
  test('List component', async ({ publishedSitePage }) => {
    await publishedSitePage.goto('/blog');
    const listItemLink = publishedSitePage.page
      .locator('.list-component-item')
      .getByRole('link', { name: 'Blog Post 1' });
    await expect(listItemLink).toHaveAttribute(
      'href',
      publishedSitePage.siteUrlPath + '/blog/post-with-metadata',
    );
  });
});
