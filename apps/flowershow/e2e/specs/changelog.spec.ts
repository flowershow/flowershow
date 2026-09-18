import { expect, test } from '../helpers/fixtures';

test('Changelog folder renders as a timeline', async ({ page, basePath }) => {
  await page.goto(`${basePath}/changelog`);

  await test.step('header from README', async () => {
    await expect(page.locator('.changelog-title')).toHaveText('Test Changelog');
    await expect(page.locator('.changelog-intro')).toContainText(
      'Updates to the test site.',
    );
  });

  await test.step('first page shows 10 full entries, newest first', async () => {
    const entries = page.locator('.changelog-entry');
    await expect(entries).toHaveCount(10);
    await expect(entries.nth(0).locator('.changelog-entry-title')).toHaveText(
      'Entry 12',
    );
    await expect(entries.nth(0).locator('.changelog-entry-body')).toContainText(
      'Body of entry 12.',
    );
    await expect(entries.nth(0)).toHaveAttribute('id', '2026-01-12-entry-12');
  });

  await test.step('pagination to page 2', async () => {
    await page.getByText('Older updates →').click();
    await expect(page).toHaveURL(/\?page=2$/);
    await expect(page.locator('.changelog-entry')).toHaveCount(2);
    await expect(page.locator('.changelog-entry-title').first()).toHaveText(
      'Entry 2',
    );
  });
});

test('Out-of-range changelog page is a 404', async ({ page, basePath }) => {
  const res = await page.goto(`${basePath}/changelog?page=99`);
  expect(res?.status()).toBe(404);
});

test('Changelog entry page', async ({ page, basePath }) => {
  await page.goto(`${basePath}/changelog/2026-01-05-entry-5`);
  await expect(page.locator('.changelog-single h1')).toHaveText('Entry 5');
  await expect(page.locator('.changelog-back')).toHaveAttribute(
    'href',
    /\/changelog$/,
  );
  await expect(page.locator('.changelog-entry-nav')).toContainText('Entry 4');
  await expect(page.locator('.changelog-entry-nav')).toContainText('Entry 6');
});

test('layout: changelog opts another folder in', async ({ page, basePath }) => {
  await page.goto(`${basePath}/releases`);
  await expect(page.locator('.changelog-title')).toHaveText('Releases');
  await expect(page.locator('.changelog-entry')).toHaveCount(1);
});
