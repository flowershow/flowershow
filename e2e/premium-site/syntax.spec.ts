import { expect, test } from '../_fixtures/published-site-test';

test.describe('Links and embeds', () => {
  test('Obsidian wiki-links', async ({ publishedSitePage }) => {
    await publishedSitePage.goto('/syntax/links-and-embeds');

    const wikiLink = publishedSitePage.page
      .getByTestId('obsidian-wiki-link')
      .locator('a');
    await expect(wikiLink).toHaveText('post-1');
    await expect(wikiLink).toHaveAttribute(
      'href',
      `${publishedSitePage.siteUrlPath}/blog/post-1`,
    );

    const wikiLinkPermalink = publishedSitePage.page
      .getByTestId('obsidian-wiki-link-to-file-with-permalink')
      .locator('a');
    await expect(wikiLinkPermalink).toHaveText('post-with-permalink');
    await expect(wikiLinkPermalink).toHaveAttribute(
      'href',
      `${publishedSitePage.siteUrlPath}/different/url`,
    );
  });
});

test('Obsidian embeds', async ({ publishedSitePage }) => {
  await publishedSitePage.goto('/syntax/links-and-embeds');

  const obsidianEmbed = publishedSitePage.page
    .getByTestId('obsidian-embed')
    .getByRole('img');
  await expect(obsidianEmbed).toHaveAttribute(
    'src',
    `${publishedSitePage.siteUrl}/_r/-/assets/image.jpg`,
  );
});
