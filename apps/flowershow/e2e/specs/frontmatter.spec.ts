import { expect, type Locator, test } from '../helpers/fixtures';

test('Frontmatter metadata', async ({ page, basePath }) => {
  await page.goto(`${basePath}/frontmatter`);
  const header = page.locator('.page-header');

  await test.step('page title comes from frontmatter', async () => {
    await expect(header.locator('h1')).toHaveText('Frontmatter');
  });

  await test.step('description is displayed', async () => {
    await expect(header).toContainText('A post with full frontmatter metadata');
  });

  await test.step('date is displayed and formatted', async () => {
    // formatDate uses en-US locale: "June 15, 2025"
    await expect(header).toContainText('June 15, 2025');
  });

  await test.step('meta description tag is set from frontmatter', async () => {
    const metaDesc = page.locator('meta[name="description"]');
    await expect(metaDesc).toHaveAttribute(
      'content',
      'A post with full frontmatter metadata',
    );
  });
});

test('Home page renders title from frontmatter', async ({ page, basePath }) => {
  await page.goto(`${basePath}`);
  const header = page.locator('.page-header');
  await expect(header.locator('h1')).toHaveText('Welcome to E2E Test Site');
});
