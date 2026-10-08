import { expect, test } from '../helpers/fixtures';

// fixtures/test-site/_footer.html is seeded into both the free site
// (`chromium` project) and the Premium site (`custom-domain` project). The
// custom footer is a Premium feature (Feature.CustomFooter): it replaces the
// default footer on Premium and is ignored on Free. On both, `_footer.html` is
// never served at its own URL or listed as a page.
const FOOTER_TEXT = 'E2E custom footer';

const isPremiumProject = () => test.info().project.name === 'custom-domain';

test('Custom footer replaces the default footer on Premium', async ({
  page,
  basePath,
}) => {
  test.skip(!isPremiumProject(), 'Custom footer is a Premium feature');

  await test.step('footer HTML is server-rendered', async () => {
    const response = await page.request.get(`${basePath}/basic-syntax`);
    expect(response.ok()).toBeTruthy();
    const html = await response.text();
    expect(html).toContain(FOOTER_TEXT);
    expect(html).toContain('e2e-footer-row');
    expect(html).toContain('id="unocss-footer"');
  });

  // A nested page: relative footer URLs must resolve from the site root, not
  // from the page's folder.
  await page.goto(`${basePath}/docs/getting-started`);
  const footer = page.locator('footer.site-footer');

  await test.step('custom content replaces the default footer body', async () => {
    await expect(footer).toHaveClass(/site-footer--custom/);
    await expect(footer.locator('.site-footer-custom')).toContainText(
      FOOTER_TEXT,
    );
    await expect(footer).not.toContainText('All rights reserved');
    await expect(footer).not.toContainText('Resources');
  });

  await test.step('it is HTML, not markdown', async () => {
    await expect(footer).toContainText('**not markdown**');
  });

  await test.step('links resolve from the site root on a nested page', async () => {
    await expect(footer.locator('a.e2e-footer-link')).toHaveAttribute(
      'href',
      '/basic-syntax',
    );
  });

  await test.step('images resolve from the site root', async () => {
    await expect(footer.locator('img.e2e-footer-image')).toHaveAttribute(
      'src',
      /^https?:\/\/[^/]+\/assets\/small-image\.jpg$/,
    );
  });

  await test.step('Tailwind classes in the footer are styled', async () => {
    await expect(footer.locator('.e2e-footer-row')).toHaveCSS(
      'display',
      'flex',
    );
  });
});

test('Custom footer is ignored on the free plan', async ({
  page,
  basePath,
}) => {
  test.skip(isPremiumProject(), 'Free-plan behaviour');

  await page.goto(`${basePath}/basic-syntax`);
  const footer = page.locator('footer.site-footer');
  await expect(footer).toContainText('Resources');
  await expect(footer).not.toContainText(FOOTER_TEXT);
});

test('_footer.html is not served or listed as a page', async ({
  page,
  basePath,
}) => {
  await test.step('/_footer.html is a 404', async () => {
    const response = await page.request.get(`${basePath}/_footer.html`);
    expect(response.status()).toBe(404);
    expect(await response.text()).not.toContain(FOOTER_TEXT);
  });

  await test.step('it is not linked from the sidebar tree or navigation', async () => {
    await page.goto(`${basePath}/docs/getting-started`);
    await expect(page.locator('.site-sidebar')).toBeVisible();
    await expect(page.locator('a[href*="_footer"]')).toHaveCount(0);
  });

  await test.step('it is not in the sitemap', async () => {
    const response = await page.request.get(`${basePath}/sitemap.xml`);
    expect(response.ok()).toBeTruthy();
    expect(await response.text()).not.toContain('_footer');
  });
});
