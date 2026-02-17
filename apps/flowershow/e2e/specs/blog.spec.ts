import { expect, test } from '@playwright/test';
import { BASE_PATH } from '../helpers/seed';

test('Blog List Component', async ({ page }) => {
  await page.goto(`${BASE_PATH}/blog`);
  const list = page.locator('.list-component');

  await test.step('renders the list component with all blog posts', async () => {
    await expect(list).toBeVisible();
    const items = list.locator('.list-component-item');
    await expect(items).toHaveCount(3);
  });

  await test.step('displays post titles as links', async () => {
    const headlines = list.locator('.list-component-item-headline a');
    await expect(headlines).toHaveCount(3);
    // Items ordered by date DESC: Third (Mar 10), Second (Feb 20), First (Jan 15)
    await expect(headlines.nth(0)).toHaveText('Third Blog Post');
    await expect(headlines.nth(1)).toHaveText('Second Blog Post');
    await expect(headlines.nth(2)).toHaveText('First Blog Post');
  });

  await test.step('displays descriptions in summary slot', async () => {
    const summaries = list.locator('.list-component-item-summary');
    await expect(summaries).toHaveCount(3);
    await expect(summaries.nth(0)).toContainText(
      'third and final test blog post',
    );
    await expect(summaries.nth(1)).toContainText('second test blog post');
    await expect(summaries.nth(2)).toContainText('first test blog post');
  });

  await test.step('headline links point to blog posts', async () => {
    const links = list.locator('.list-component-item-headline a');
    await expect(links.nth(0)).toHaveAttribute('href', /blog\/third-post/);
    await expect(links.nth(1)).toHaveAttribute('href', /blog\/second-post/);
    await expect(links.nth(2)).toHaveAttribute('href', /blog\/first-post/);
  });
});

test('Blog Post Page', async ({ page }) => {
  await page.goto(`${BASE_PATH}/blog/first-post`);
  const content = page.locator('#mdxpage');

  await test.step('renders the blog post content', async () => {
    await expect(
      content.locator('h2', { hasText: 'Introduction' }),
    ).toBeVisible();
    await expect(content).toContainText('Welcome to the first blog post');
  });
});

test('Blog Post Navigation from List', async ({ page }) => {
  await page.goto(`${BASE_PATH}/blog`);
  const list = page.locator('.list-component');

  await test.step('clicking a post title navigates to the post', async () => {
    const firstLink = list.locator('.list-component-item-headline a').first();
    await firstLink.click();
    await expect(page).toHaveURL(/blog\/third-post/);
    await expect(page.locator('#mdxpage')).toContainText('third blog post');
  });
});
