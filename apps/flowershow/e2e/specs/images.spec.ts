import { expect, test } from '@playwright/test';
import { decodeImageSrc } from '../helpers/decode-image-src';

const TEST_USER = process.env.GH_E2E_TEST_ACCOUNT || 'e2e-testuser';
const TEST_PROJECT = 'e2e-test-site';
const BASE_PATH = `/@${TEST_USER}/${TEST_PROJECT}`;

test.describe('Images', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_PATH}/images`);
  });

  test('renders markdown images', async ({ page }) => {
    const content = page.locator('#mdxpage');
    const images = content.locator('img');
    await expect(images.first()).toBeVisible();
  });

  test('images have alt text', async ({ page }) => {
    const content = page.locator('#mdxpage');
    const img = content.locator('img').first();
    await expect(img).toHaveAttribute('alt', 'Test image');
  });

  test('image src points to asset via Next.js Image or direct URL', async ({
    page,
  }) => {
    const content = page.locator('#mdxpage');
    const img = content.locator('img').first();
    const src = await img.getAttribute('src');
    expect(src).toBeTruthy();
    const decoded = decodeImageSrc(src!);
    expect(decoded).toContain('test-image');
  });
});
