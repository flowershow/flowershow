import { expect, test } from '../helpers/fixtures';

test('HTML Page Rendering', async ({ page, basePath }) => {
  const response = await page.goto(`${basePath}/docs/test.html`);

  await test.step('is not sandboxed on a claimed site (flowershow-ctv)', async () => {
    expect(response?.headers()['content-security-policy']).toBeUndefined();
    await expect(page.locator('#flowershow-anon-banner')).toHaveCount(0);
  });

  await test.step('renders the page title', async () => {
    await expect(page).toHaveTitle('Test HTML Page');
  });

  await test.step('renders the paragraph', async () => {
    await expect(page.locator('p')).toHaveText(
      'This is a basic HTML page served as a static file.',
    );
  });
});
