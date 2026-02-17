import { expect, test } from '@playwright/test';
import { BASE_PATH } from '../helpers/seed';

test('Links', async ({ page }) => {
  await page.goto(`${BASE_PATH}/links`);
  const content = page.locator('#mdxpage');

  await test.step('internal links resolve to site paths', async () => {
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

  await test.step('external links have correct href', async () => {
    const extLink = content.locator('a', { hasText: 'External link' });
    await expect(extLink).toHaveAttribute('href', 'https://example.com');
  });

  await test.step('anchor links point to heading ids', async () => {
    const anchorLink = content.locator('a', { hasText: 'Link to anchor' });
    await expect(anchorLink).toHaveAttribute('href', '#anchor-target');
  });

  // Navigation test last since it changes the page
  await test.step('internal link navigates to correct page', async () => {
    const syntaxLink = content.locator('a', {
      hasText: 'Internal link to basic syntax',
    });
    await syntaxLink.click();
    await expect(page.locator('h1')).toHaveText('Basic Syntax');
  });
});
