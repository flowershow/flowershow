import { expect, test } from '../helpers/fixtures';

test('Backlinks panel shows incoming links', async ({ page, basePath }) => {
  await page.goto(`${basePath}/backlinks-target`);

  const panel = page.locator('.page-backlinks-container');
  await expect(panel).toBeVisible();
  await expect(panel.locator('.page-backlinks-title')).toHaveText(
    'Links to this page:',
  );

  const items = panel.locator('.page-backlinks-list li');
  await expect(items).toHaveCount(2);

  await test.step('source 1 link has correct text and href', async () => {
    const link = panel.locator('a', { hasText: 'Backlinks Source One' });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute(
      'href',
      `${basePath}/backlinks-source-1`,
    );
  });

  await test.step('source 2 link has correct text and href', async () => {
    const link = panel.locator('a', { hasText: 'Backlinks Source Two' });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute(
      'href',
      `${basePath}/backlinks-source-2`,
    );
  });
});

test('No backlinks panel when no incoming links', async ({
  page,
  basePath,
}) => {
  await page.goto(`${basePath}/backlinks-source-1`);
  await expect(page.locator('.page-backlinks-container')).toHaveCount(0);
});

test('Clicking a backlink navigates to the source page', async ({
  page,
  basePath,
}) => {
  await page.goto(`${basePath}/backlinks-target`);
  const link = page.locator('.page-backlinks-list a', {
    hasText: 'Backlinks Source One',
  });
  await link.click();
  await expect(page).toHaveURL(new RegExp(`${basePath}/backlinks-source-1$`));
  await expect(page.locator('#mdxpage')).toContainText('This page links to');
});
