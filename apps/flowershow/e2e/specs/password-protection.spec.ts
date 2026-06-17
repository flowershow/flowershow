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
  });
});
