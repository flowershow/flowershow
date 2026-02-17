import { expect, test } from '@playwright/test';

const TEST_USER = process.env.GH_E2E_TEST_ACCOUNT || 'e2e-testuser';
const TEST_PROJECT = 'e2e-test-site';
const BASE_PATH = `/@${TEST_USER}/${TEST_PROJECT}`;

test.describe('Links', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_PATH}/links`);
  });

  test('internal links resolve to site paths', async ({ page }) => {
    const content = page.locator('#mdxpage');

    const homeLink = content.locator('a', { hasText: 'Internal link to home' });
    await expect(homeLink).toHaveAttribute('href', /\/@.+\/e2e-test-site\/?$/);

    const syntaxLink = content.locator('a', {
      hasText: 'Internal link to basic syntax',
    });
    await expect(syntaxLink).toHaveAttribute(
      'href',
      /\/@.+\/e2e-test-site\/basic-syntax$/,
    );
  });

  test('external links have correct href', async ({ page }) => {
    const content = page.locator('#mdxpage');
    const extLink = content.locator('a', { hasText: 'External link' });
    await expect(extLink).toHaveAttribute('href', 'https://example.com');
  });

  test('anchor links point to heading ids', async ({ page }) => {
    const content = page.locator('#mdxpage');
    const anchorLink = content.locator('a', { hasText: 'link to anchor' });
    await expect(anchorLink).toHaveAttribute('href', '#anchor-target');
  });

  test('internal link navigates to correct page', async ({ page }) => {
    const content = page.locator('#mdxpage');
    const syntaxLink = content.locator('a', {
      hasText: 'Internal link to basic syntax',
    });
    await syntaxLink.click();
    await expect(page.locator('#mdxpage h1')).toHaveText('Heading 1');
  });
});
