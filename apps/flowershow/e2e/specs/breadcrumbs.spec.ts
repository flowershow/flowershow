import { expect, test } from '../helpers/fixtures';

test('Page header breadcrumbs', async ({ page, basePath }) => {
  await test.step('are on by default and show the folder trail', async () => {
    await page.goto(`${basePath}/subfolder/nested-page`);
    const crumbs = page.locator('.page-header-breadcrumbs');
    await expect(crumbs).toBeVisible();
    await expect(crumbs.locator('li')).toHaveText([
      'Subfolder Index',
      'Nested Page',
    ]);
    // Folder with a README links to it; the current page is not a link
    await expect(
      crumbs.getByRole('link', { name: 'Subfolder Index' }),
    ).toHaveAttribute('href', `${basePath}/subfolder`);
    await expect(crumbs.locator('li[aria-current="page"]')).toHaveText(
      'Nested Page',
    );
    await expect(crumbs.getByRole('link', { name: 'Nested Page' })).toHaveCount(
      0,
    );
  });

  await test.step('frontmatter section replaces the folder trail', async () => {
    await page.goto(`${basePath}/tables`);
    const crumbs = page.locator('.page-header-breadcrumbs');
    await expect(crumbs.locator('li')).toHaveText(['Use it', 'Tables Test']);
    await expect(crumbs.getByRole('link')).toHaveCount(0);
  });

  await test.step('frontmatter showBreadcrumbs: false hides them', async () => {
    await page.goto(`${basePath}/subfolder/breadcrumbs-off`);
    await expect(page.locator('.page-header-title')).toHaveText(
      'Breadcrumbs Off',
    );
    await expect(page.locator('.page-header-breadcrumbs')).toHaveCount(0);
  });
});
