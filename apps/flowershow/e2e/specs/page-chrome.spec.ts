import { expect, test } from '../helpers/fixtures';

// Per-page `showNavbar: false` / `showFooter: false` hide the layout's navbar
// and footer via a marker the page renders plus CSS :has() rules.

test('showNavbar/showFooter: false hide the site chrome', async ({
  page,
  basePath,
}) => {
  await test.step('the marker is in the server-rendered HTML (no flash)', async () => {
    const response = await page.request.get(`${basePath}/no-chrome`);
    expect(response.ok()).toBeTruthy();
    const html = await response.text();
    expect(html).toContain('data-page-chrome');
    expect(html).toContain('data-hide-navbar');
    expect(html).toContain('data-hide-footer');
  });

  await page.goto(`${basePath}/no-chrome`);

  await test.step('navbar and footer are hidden', async () => {
    await expect(page.locator('h1')).toHaveText('Bespoke landing page');
    await expect(page.locator('nav.site-navbar')).toBeHidden();
    await expect(page.locator('footer.site-footer')).toBeHidden();
    await expect(page.getByRole('navigation')).toHaveCount(0);
    await expect(page.getByRole('contentinfo')).toHaveCount(0);
  });

  await test.step('soft navigation to a normal page brings the chrome back', async () => {
    await page.getByRole('link', { name: 'Back to home' }).click();
    await expect(page).not.toHaveURL(/no-chrome/);
    await expect(page.locator('nav.site-navbar')).toBeVisible();
    await expect(page.locator('footer.site-footer')).toBeVisible();
  });
});

test('showFooter: false hides only the footer', async ({ page, basePath }) => {
  await page.goto(`${basePath}/no-footer`);
  await expect(page.locator('nav.site-navbar')).toBeVisible();
  await expect(page.locator('footer.site-footer')).toBeHidden();

  await test.step('soft navigation to a no-chrome page hides the navbar too', async () => {
    await page.getByRole('link', { name: 'Go to the no-chrome page' }).click();
    await expect(page).toHaveURL(/no-chrome/);
    await expect(page.locator('nav.site-navbar')).toBeHidden();
    await expect(page.locator('footer.site-footer')).toBeHidden();
  });
});

test('showNavbar: false moves sticky elements to the top', async ({
  page,
  basePath,
}) => {
  await page.goto(`${basePath}/docs/no-navbar`);
  await expect(page.locator('nav.site-navbar')).toBeHidden();
  await expect(page.locator('footer.site-footer')).toBeVisible();

  // .site-sidebar is sticky at `calc(var(--navbar-height) + 2rem)`; with the
  // navbar hidden the token is zeroed, so it sits 2rem (32px) from the top.
  await expect(page.locator('.site-sidebar')).toHaveCSS('top', '32px');
});
