import { expect, test } from '../helpers/fixtures';

// fixtures/test-site/_footer.md is seeded into both the free site (`chromium`
// project) and the Premium site (`custom-domain` project). The custom footer
// is a Premium feature (Feature.CustomFooter): it replaces the default footer
// on Premium and is ignored on Free. On both, `_footer.md` is never a page.
const FOOTER_TEXT = 'E2E custom footer';

const isPremiumProject = () => test.info().project.name === 'custom-domain';

test('Custom footer replaces the default footer on Premium', async ({
  page,
  basePath,
}) => {
  test.skip(!isPremiumProject(), 'Custom footer is a Premium feature');

  await test.step('footer HTML is server-rendered (md mode)', async () => {
    const response = await page.request.get(`${basePath}/basic-syntax`);
    expect(response.ok()).toBeTruthy();
    expect(await response.text()).toContain(FOOTER_TEXT);
  });

  await page.goto(`${basePath}/basic-syntax`);
  const footer = page.locator('footer.site-footer');

  await test.step('custom content replaces the default footer body', async () => {
    await expect(footer).toHaveClass(/site-footer--custom/);
    await expect(footer.locator('.site-footer-custom')).toContainText(
      FOOTER_TEXT,
    );
    await expect(footer).not.toContainText('All rights reserved');
    await expect(footer).not.toContainText('Resources');
  });

  await test.step('wiki links resolve like on a page', async () => {
    const link = footer.locator('a', { hasText: 'footer wiki link' });
    await expect(link).toHaveAttribute('href', /\/basic-syntax$/);
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

test('_footer.md is not published as a page', async ({ page, basePath }) => {
  await test.step('/_footer is a 404', async () => {
    await page.goto(`${basePath}/_footer`);
    await expect(page.locator('.not-found')).toBeVisible();
  });

  await test.step('it is not in the sitemap', async () => {
    const response = await page.request.get(`${basePath}/sitemap.xml`);
    expect(response.ok()).toBeTruthy();
    expect(await response.text()).not.toContain('_footer');
  });
});
