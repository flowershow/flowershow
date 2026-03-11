import { expect, test } from '../helpers/fixtures';

test('HTML Page Rendering', async ({ page, basePath }) => {
  await page.goto(`${basePath}/test.html`);

  await test.step('renders the page title', async () => {
    await expect(page).toHaveTitle('Test HTML Page');
  });

  await test.step('renders the paragraph', async () => {
    await expect(page.locator('p')).toHaveText(
      'This is a basic HTML page served as a static file.',
    );
  });
});
