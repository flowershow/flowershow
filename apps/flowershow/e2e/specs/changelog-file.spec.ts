import { expect, test } from '../helpers/fixtures';

test('CHANGELOG.md renders as a changelog timeline', async ({
  page,
  basePath,
}) => {
  await page.goto(`${basePath}/CHANGELOG`);

  await test.step('title, intro and entries (empty Unreleased skipped)', async () => {
    await expect(page.locator('.changelog-title')).toHaveText('Changelog');
    await expect(page.locator('.changelog-intro')).toContainText(
      'All notable changes',
    );
    const entries = page.locator('li.changelog-entry');
    await expect(entries).toHaveCount(3);
    await expect(entries.first()).toHaveAttribute('id', '1.1.0');
    await expect(entries.first().locator('time')).toHaveText('Feb 3, 2026');
  });

  await test.step('reference links resolve, and the heading link becomes Compare', async () => {
    await expect(
      page.locator('.changelog-entry-body a[href*="example.com/compare"]'),
    ).toHaveCount(1);
    await expect(
      page
        .locator('li.changelog-entry')
        .first()
        .locator('a.changelog-entry-compare'),
    ).toHaveText('Compare');
  });

  await test.step('entry anchors work', async () => {
    await page.goto(`${basePath}/CHANGELOG#0.9.0`);
    await expect(page.locator('li.changelog-entry#0\\.9\\.0')).toBeInViewport();
  });
});

test('a changelog/ folder keeps /changelog', async ({ page, basePath }) => {
  await page.goto(`${basePath}/changelog`);
  await expect(page.locator('.changelog-title')).toHaveText('Test Changelog');
});

test('Changesets CHANGELOG.md in a subfolder, also at lowercase /changelog', async ({
  page,
  basePath,
}) => {
  for (const path of ['/packages/cli/CHANGELOG', '/packages/cli/changelog']) {
    await page.goto(`${basePath}${path}`);
    await expect(page.locator('.changelog-title')).toHaveText('@demo/cli');
    await expect(page.locator('h2.changelog-entry-title')).toHaveText([
      '2.0.0',
      '1.0.0',
    ]);
  }
});

test('layout: default opts a changelog.md out', async ({ page, basePath }) => {
  await page.goto(`${basePath}/notes/changelog`);
  await expect(page.locator('.changelog')).toHaveCount(0);
  await expect(page.locator('#mdxpage')).toContainText('opt out');
});
