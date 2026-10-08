import { expect, test } from '../helpers/fixtures';

// `--navbar-height` drives the navbar's own height and every offset that has
// to clear it (#1341). The default (4rem) must render exactly as before.

const heading = '.rendered-mdx h2';

test('--navbar-height defaults to the original 4rem layout', async ({
  page,
  basePath,
}) => {
  await page.goto(`${basePath}/tables`);
  await expect(page.locator('.site-navbar-inner')).toHaveCSS('height', '64px');
  await expect(page.locator(heading).first()).toHaveCSS(
    'scroll-margin-top',
    '72px',
  );
});

test('overriding --navbar-height resizes the navbar and its offsets', async ({
  page,
  basePath,
}) => {
  await page.goto(`${basePath}/tables`);
  await page.addStyleTag({ content: ':root { --navbar-height: 3rem; }' });

  await expect(page.locator('.site-navbar-inner')).toHaveCSS('height', '48px');
  // Anchor targets clear the navbar plus 0.5rem.
  await expect(page.locator(heading).first()).toHaveCSS(
    'scroll-margin-top',
    '56px',
  );
});

test('changelog sticky offset follows --navbar-height', async ({
  page,
  basePath,
}) => {
  await page.goto(`${basePath}/changelog`);
  const entry = page.locator('.changelog-entry').first();
  await expect(entry).toHaveCSS('scroll-margin-top', '80px');

  await page.addStyleTag({ content: ':root { --navbar-height: 3rem; }' });
  await expect(entry).toHaveCSS('scroll-margin-top', '64px');
});
