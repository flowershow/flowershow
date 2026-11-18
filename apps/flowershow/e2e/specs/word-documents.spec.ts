import { expect, test } from '../helpers/fixtures';

// "Word Docs/Board Memo.docx" is seeded with its pre-converted Markdown (see
// e2e/helpers/seed.ts); the worker is not run in e2e.
test('Word document page', async ({ page, basePath }) => {
  await page.goto(`${basePath}/Word+Docs/Board+Memo`);
  const content = page.locator('#mdxpage');

  await test.step('renders headings, table, image and footnote', async () => {
    await expect(
      content.getByRole('heading', { name: 'Board Memo', level: 1 }),
    ).toBeVisible();
    await expect(
      content.locator('td', { hasText: 'North' }).first(),
    ).toBeVisible();

    const img = content.locator('img').first();
    await expect(img).toBeVisible();
    await expect
      .poll(() => img.evaluate((el: HTMLImageElement) => el.naturalWidth))
      .toBeGreaterThan(0);

    await expect(content).toContainText('A Word footnote.');
  });

  await test.step('is listed in the sitemap', async () => {
    const sitemap = await (
      await page.request.get(`${basePath}/sitemap.xml`)
    ).text();
    expect(sitemap).toMatch(/<loc>[^<]*\/Word\+Docs\/Board\+Memo<\/loc>/);
  });
});

test('Word document download', async ({ request, basePath }) => {
  const res = await request.get(`${basePath}/Word%20Docs/Board%20Memo.docx`);
  expect(res.status()).toBe(200);
  const body = await res.body();
  expect(body.subarray(0, 2).toString()).toBe('PK');
});
