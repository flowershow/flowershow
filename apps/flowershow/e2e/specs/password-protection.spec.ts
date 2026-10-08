import { expectCustomCssLinked } from '../helpers/custom-css';
import { expect, test } from '../helpers/fixtures';
import {
  PASSWORD_SITE,
  PASSWORD_SITE_PASSWORD,
  TEST_USER,
} from '../helpers/seed';

test.describe('Password-protected site', () => {
  test.describe('unauthenticated', () => {
    test('page access redirects to login', async ({ page }) => {
      await page.goto('/');
      expect(page.url()).toContain('/_login');
    });

    test('non-image raw file redirects to login', async ({ page }) => {
      await page.goto('/basic-syntax.md');
      expect(page.url()).toContain('/_login');
    });

    test('html raw file redirects to login', async ({ page }) => {
      await page.goto('/docs/test.html');
      expect(page.url()).toContain('/_login');
    });

    test('custom.css redirects to login', async ({ page }) => {
      await page.goto('/custom.css');
      expect(page.url()).toContain('/_login');
    });

    test('direct API call to non-image raw file returns 401', async ({
      page,
      baseURL,
    }) => {
      const response = await page.request.get(
        `${baseURL}/api/raw/${TEST_USER.username}/${PASSWORD_SITE.projectName}/basic-syntax.md`,
      );
      expect(response.status()).toBe(401);
    });

    test('images are accessible without auth', async ({ page }) => {
      const response = await page.request.get('/assets/image.jpg');
      expect(response.status()).toBe(200);
    });

    test('annotations API returns 404 without the access cookie', async ({
      page,
    }) => {
      const response = await page.request.get(
        `/api/sites/id/${PASSWORD_SITE.id}/annotations?path=annotations-demo.md`,
      );
      expect(response.status()).toBe(404);
    });
  });

  test.describe('authenticated', () => {
    test.beforeEach(async ({ page, baseURL }) => {
      const response = await page.request.post(
        `${baseURL}/api/sites/id/${PASSWORD_SITE.id}/login`,
        { form: { password: PASSWORD_SITE_PASSWORD } },
      );
      expect(response.status()).toBe(200);
    });

    test('page is accessible', async ({ page }) => {
      await page.goto('/');
      expect(page.url()).not.toContain('/_login');
      await expect(page.locator('body')).toBeVisible();
    });

    test('non-image raw file is accessible', async ({ page }) => {
      const response = await page.goto('/basic-syntax.md');
      expect(page.url()).not.toContain('/_login');
      expect(response?.status()).toBe(200);
    });

    test('html raw file is accessible', async ({ page }) => {
      const response = await page.goto('/docs/test.html');
      expect(page.url()).not.toContain('/_login');
      expect(response?.status()).toBe(200);
    });

    test('custom.css is a privately cached same-origin stylesheet', async ({
      page,
    }) => {
      await expectCustomCssLinked(page, '/subfolder/nested-page', {
        cacheScope: 'private',
      });
    });

    test('annotations API works after login', async ({ page }) => {
      const response = await page.request.get(
        `/api/sites/id/${PASSWORD_SITE.id}/annotations?path=annotations-demo.md`,
      );
      expect(response.status()).toBe(200);
      expect(Array.isArray((await response.json()).annotations)).toBe(true);
    });
  });
});
