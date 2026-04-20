import { expect, test } from '../helpers/fixtures';

test('Tables', async ({ page, basePath }) => {
  await page.goto(`${basePath}/tables`);
  const content = page.locator('#mdxpage');

  const firstTable = content.locator('table').first();

  await test.step('renders GFM table as HTML table', async () => {
    await expect(firstTable).toBeVisible();
  });

  await test.step('table has correct header cells', async () => {
    const headers = firstTable.locator('thead th');
    await expect(headers).toHaveCount(3);
    await expect(headers.nth(0)).toHaveText('Name');
    await expect(headers.nth(1)).toHaveText('Age');
    await expect(headers.nth(2)).toHaveText('City');
  });

  await test.step('table has correct data rows', async () => {
    const rows = firstTable.locator('tbody tr');
    await expect(rows).toHaveCount(3);
    await expect(rows.first().locator('td').first()).toHaveText('Alice');
    await expect(rows.last().locator('td').last()).toHaveText('Tokyo');
  });

  await test.step('wiki-link with escaped alias (\\|) renders as link inside table cell', async () => {
    const link = content.locator('table a[href*="basic-syntax"]');
    await expect(link).toBeVisible();
    await expect(link).toHaveText('Basic Syntax Guide');
  });

  await test.step('multiple wiki-links with escaped aliases render correctly in table', async () => {
    const link = content.locator('table a[href*="frontmatter"]');
    await expect(link).toBeVisible();
    await expect(link).toHaveText('Frontmatter Guide');
  });

  await test.step('wiki-link with unescaped alias (|) renders as link outside table', async () => {
    const link = content.locator('p a[href*="basic-syntax"]');
    await expect(link).toBeVisible();
    await expect(link).toHaveText('Syntax Reference');
  });
});
