import { expect, type Locator, test } from '@playwright/test';
import { BASE_PATH } from '../helpers/seed';

const expectOptimizedImage = async (img: Locator) => {
  await expect(img).toHaveAttribute('src', /\/_next\/image\?url=/);
  await expect(img).toHaveAttribute('srcset', /\/_next\/image\?url=/);
  await expect(img).toHaveAttribute('data-fs-resolved-file-path', /.+/);
  await expect(img).toHaveAttribute('data-fs-intrinsic-width', /^\d+$/);
  await expect(img).toHaveAttribute('data-fs-intrinsic-height', /^\d+$/);
};

const sectionImages = (content: Locator, heading: string) =>
  content
    .getByRole('heading', { level: 2, name: heading })
    .locator('xpath=following-sibling::p//img');

test('Links', async ({ page }) => {
  await page.goto(`${BASE_PATH}/links-and-embeds`);
  const content = page.locator('#mdxpage');

  // ── CommonMark Links ──────────────────────────────────────────

  await test.step('CM: internal link to home resolves to site path', async () => {
    const link = content.locator('a', { hasText: 'Internal link to home' });
    await expect(link).toHaveAttribute('href', /\/@.+\/e2e-test-site\/?$/);
  });

  await test.step('CM: internal link to page resolves to site path', async () => {
    const link = content.locator('a', {
      hasText: 'Internal link to basic syntax',
    });
    await expect(link).toHaveAttribute(
      'href',
      /\/@.+\/e2e-test-site\/basic-syntax$/,
    );
  });

  await test.step('CM: external link has correct href', async () => {
    const link = content.locator('a', { hasText: 'External link' });
    await expect(link).toHaveAttribute('href', 'https://example.com');
  });

  await test.step('CM: anchor link points to heading id', async () => {
    const link = content.locator('a', { hasText: 'Link to anchor' });
    await expect(link).toHaveAttribute('href', '#anchor-target');
  });

  await test.step('CM: link to nested page resolves path', async () => {
    const link = content.locator('a', { hasText: /^Link to nested page$/ });
    await expect(link).toHaveAttribute(
      'href',
      /\/@.+\/e2e-test-site\/subfolder\/nested-page$/,
    );
  });

  await test.step('CM: link with title has title attribute', async () => {
    const link = content.locator('a', { hasText: 'Link with title' });
    await expect(link).toHaveAttribute('href', 'https://example.com');
    await expect(link).toHaveAttribute('title', 'Example Title');
  });

  await test.step('CM: dot-slash relative link resolves', async () => {
    const link = content.locator('a', {
      hasText: 'Dot-slash link to basic syntax',
    });
    await expect(link).toHaveAttribute(
      'href',
      /\/@.+\/e2e-test-site\/basic-syntax$/,
    );
  });

  await test.step('CM: dot-slash relative link to nested page resolves', async () => {
    const link = content.locator('a', {
      hasText: 'Dot-slash link to nested page',
    });
    await expect(link).toHaveAttribute(
      'href',
      /\/@.+\/e2e-test-site\/subfolder\/nested-page$/,
    );
  });

  await test.step('CM: link to README resolves to folder path', async () => {
    const link = content.locator('a', {
      hasText: 'Link to subfolder readme',
    });
    await expect(link).toHaveAttribute(
      'href',
      /\/@.+\/e2e-test-site\/subfolder\/?$/,
    );
  });

  // ── Obsidian Wiki Links ───────────────────────────────────────

  await test.step('wiki: simple link renders with internal class', async () => {
    const link = content.locator('a.internal', { hasText: /^basic-syntax$/ });
    await expect(link).toHaveAttribute(
      'href',
      /\/@.+\/e2e-test-site\/basic-syntax$/,
    );
  });

  await test.step('wiki: link with alias shows alias text', async () => {
    const link = content.locator('a.internal', {
      hasText: 'Custom Link Text',
    });
    await expect(link).toHaveAttribute(
      'href',
      /\/@.+\/e2e-test-site\/basic-syntax$/,
    );
  });

  await test.step('wiki: link to index resolves to site root', async () => {
    const link = content.locator('a.internal', { hasText: /^index$/ });
    await expect(link).toHaveAttribute('href', /\/@.+\/e2e-test-site\/?$/);
  });

  await test.step('wiki: shortest-possible matches nested page', async () => {
    const link = content.locator('a.internal', { hasText: /^nested-page$/ });
    await expect(link).toHaveAttribute(
      'href',
      /\/@.+\/e2e-test-site\/subfolder\/nested-page$/,
    );
  });

  await test.step('wiki: explicit path to nested page', async () => {
    const link = content.locator('a.internal', {
      hasText: /^subfolder\/nested-page$/,
    });
    await expect(link).toHaveAttribute(
      'href',
      /\/@.+\/e2e-test-site\/subfolder\/nested-page$/,
    );
  });

  await test.step('wiki: link with heading fragment', async () => {
    const link = content.locator('a.internal', {
      hasText: /^nested-page#section-one$/,
    });
    await expect(link).toHaveAttribute(
      'href',
      /\/@.+\/e2e-test-site\/subfolder\/nested-page#section-one$/,
    );
  });

  await test.step('wiki: link with heading and alias', async () => {
    const link = content.locator('a.internal', {
      hasText: 'Nested Section Link',
    });
    await expect(link).toHaveAttribute(
      'href',
      /\/@.+\/e2e-test-site\/subfolder\/nested-page#section-one$/,
    );
  });

  await test.step('wiki: non-existent target gets "new" class', async () => {
    const link = content.locator('a.internal.new', {
      hasText: 'nonexistent-page',
    });
    await expect(link).toBeVisible();
  });

  await test.step('wiki: README link resolves to folder path', async () => {
    const link = content.locator('a.internal', { hasText: /^README$/ });
    await expect(link).toHaveAttribute(
      'href',
      /\/@.+\/e2e-test-site\/subfolder\/?$/,
    );
  });

  // ── CommonMark Embeds ─────────────────────────────────────────

  await test.step('CM embed: image renders with alt text', async () => {
    const img = content.locator('img[alt="CM image"]');
    await expect(img).toBeVisible();
    await expectOptimizedImage(img);
  });

  await test.step('CM embed: image with title has title attribute', async () => {
    const img = content.locator('img[alt="CM image with title"]');
    await expect(img).toBeVisible();
    await expect(img).toHaveAttribute('title', 'Image Title');
    await expectOptimizedImage(img);
  });

  // ── Obsidian Embeds ───────────────────────────────────────────

  const obsidianEmbedImages = sectionImages(content, 'Obsidian Embeds');

  await test.step('wiki embed: image renders', async () => {
    const img = obsidianEmbedImages.nth(0);
    await expect(img).toBeVisible({ timeout: 10_000 }); // TODO, the image is already optimized, not sure why it takes so long to load
    await expectOptimizedImage(img);
    await expect(img).not.toHaveAttribute('data-fs-width', /.+/);
    await expect(img).not.toHaveAttribute('data-fs-height', /.+/);
  });

  await test.step('wiki embed: image with width has data-fs-width', async () => {
    const img = obsidianEmbedImages.nth(1);
    await expect(img).toBeVisible();
    await expect(img).toHaveAttribute('data-fs-width', '300');
    await expect(img).not.toHaveAttribute('data-fs-height', '300');
    await expectOptimizedImage(img);
  });

  await test.step('wiki embed: image with dimensions has both data attributes', async () => {
    const img = obsidianEmbedImages.nth(2);
    await expect(img).toBeVisible();
    await expectOptimizedImage(img);
    await expect(img).toHaveAttribute('data-fs-width', '300');
    await expect(img).toHaveAttribute('data-fs-height', '200');
  });

  // ── Navigation (last, since it changes the page) ──────────────

  await test.step('CM link navigates to correct page', async () => {
    const link = content.locator('a', {
      hasText: 'Internal link to basic syntax',
    });
    await link.click();
    await expect(page.locator('h1')).toHaveText('Basic Syntax');
  });

  await test.step('wiki link navigates to correct page', async () => {
    const link = content.locator('a.internal', { hasText: /^basic-syntax$/ });
    await link.click();
    await expect(page.locator('h1')).toHaveText('Basic Syntax');
  });

  await test.step('wiki link navigates to nested page', async () => {
    const link = content.locator('a.internal', { hasText: /^nested-page$/ });
    await link.click();
    await expect(page.locator('h1')).toHaveText('Nested Page');
  });

  // ── Relative links from nested page ───────────────────────────

  await page.goto(`${BASE_PATH}/subfolder/nested-page`);
  const nestedContent = page.locator('#mdxpage');

  await test.step('nested: parent-relative link (../) resolves to root page', async () => {
    const link = nestedContent.locator('a', {
      hasText: 'Parent-relative link to basic syntax',
    });
    await expect(link).toHaveAttribute(
      'href',
      /\/@.+\/e2e-test-site\/basic-syntax$/,
    );
  });

  await test.step('nested: dot-slash link (./README.md) resolves to folder path', async () => {
    const link = nestedContent.locator('a', {
      hasText: 'Dot-slash link to readme',
    });
    await expect(link).toHaveAttribute(
      'href',
      /\/@.+\/e2e-test-site\/subfolder\/?$/,
    );
  });

  await test.step('nested: parent-relative link navigates correctly', async () => {
    const link = nestedContent.locator('a', {
      hasText: 'Parent-relative link to basic syntax',
    });
    await link.click();
    await expect(page.locator('h1')).toHaveText('Basic Syntax');
  });
});
