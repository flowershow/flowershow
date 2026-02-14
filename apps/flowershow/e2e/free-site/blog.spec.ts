import { expect, test } from '../_fixtures/published-site-test';

test.describe('Blog layout', () => {
  test('Author attribution', async ({ publishedSitePage }) => {
    await publishedSitePage.goto('/blog/author-attribution');
    const header = publishedSitePage.page.locator('header');

    // With corresponding profile page, matched by file name
    // john-doe -> /team/john-doe.md
    await expect(header).toHaveText(/John Doe/);

    // No corresponding profile page
    await expect(header).toHaveText(/Jan Kowalski/);

    // With corresponding profile page, matched by title
    // Jane Doe -> /team/jane-doe.md (title: Jane Doe)
    // await expect(header).toHaveText(/Jane Doe/);
  });
});
