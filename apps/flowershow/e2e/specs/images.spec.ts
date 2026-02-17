import { expect, test } from '@playwright/test';
import { decodeImageSrc } from '../helpers/decode-image-src';
import { BASE_PATH } from '../helpers/seed';

test('Images', async ({ page }) => {
  await page.goto(`${BASE_PATH}/images`);
  const content = page.locator('#mdxpage');

  await test.step('renders markdown images', async () => {
    const images = content.locator('img');
    await expect(images.first()).toBeVisible();
  });

  await test.step('images have alt text', async () => {
    const img = content.locator('img').first();
    await expect(img).toHaveAttribute('alt', 'Test image');
  });

  await test.step('image src points to asset via Next.js Image or direct URL', async () => {
    const img = content.locator('img').first();
    const src = await img.getAttribute('src');
    expect(src).toBeTruthy();
    const decoded = decodeImageSrc(src!);
    expect(decoded).toContain('test-image');
  });
});
