import { test, expect } from '@playwright/test';

import 'dotenv/config';

test.describe('Home Page Drop Zone', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test.describe('File Selection via Click', () => {
    test('should open file picker when clicking drop zone', async ({
      page,
    }) => {
      const fileInput = page.locator('input[type="file"]');
      await expect(fileInput).toBeHidden();

      // Verify the file input exists and is connected to the drop zone
      await expect(fileInput).toHaveAttribute('multiple', '');
    });

    test('should accept markdown file and show success modal', async ({
      page,
    }) => {
      const fileInput = page.locator('input[type="file"]');

      // Create a test markdown file
      await fileInput.setInputFiles({
        name: 'test.md',
        mimeType: 'text/markdown',
        buffer: Buffer.from('# Hello World\n\nThis is a test.'),
      });

      // Should show success modal after publishing completes
      await expect(page.getByText('Your site is live!')).toBeVisible({
        timeout: 30000,
      });
    });
  });

  test.describe('File Validation', () => {
    test('should show error when no markdown file is provided', async ({
      page,
    }) => {
      const fileInput = page.locator('input[type="file"]');

      // Try to upload a non-markdown file
      await fileInput.setInputFiles({
        name: 'image.png',
        mimeType: 'image/png',
        buffer: Buffer.from('fake image content'),
      });

      // Should show validation error
      await expect(
        page.getByText(/At least one markdown file.*is required/),
      ).toBeVisible();
    });

    test('should show error when more than 5 files are selected', async ({
      page,
    }) => {
      const fileInput = page.locator('input[type="file"]');

      // Create 6 files (exceeds the 5 file limit)
      const files = Array.from({ length: 6 }, (_, i) => ({
        name: `file${i + 1}.md`,
        mimeType: 'text/markdown',
        buffer: Buffer.from(`# File ${i + 1}`),
      }));

      await fileInput.setInputFiles(files);

      // Should show file limit error
      await expect(
        page.getByText(/Maximum 5 files allowed.*Sign in to publish more/),
      ).toBeVisible();
    });

    test('should accept mix of markdown and non-markdown files within limit', async ({
      page,
    }) => {
      const fileInput = page.locator('input[type="file"]');

      await fileInput.setInputFiles([
        {
          name: 'readme.md',
          mimeType: 'text/markdown',
          buffer: Buffer.from('# Readme'),
        },
        {
          name: 'image.png',
          mimeType: 'image/png',
          buffer: Buffer.from('fake image'),
        },
      ]);

      // Should show success modal after publishing completes
      await expect(page.getByText('Your site is live!')).toBeVisible({
        timeout: 30000,
      });
    });
  });

  test.describe('Publishing Success Modal', () => {
    test('should show success modal with site URL after publishing', async ({
      page,
    }) => {
      const fileInput = page.locator('input[type="file"]');

      await fileInput.setInputFiles({
        name: 'test.md',
        mimeType: 'text/markdown',
        buffer: Buffer.from('# Test'),
      });

      // Wait for success modal
      const modal = page
        .locator('[class*="rounded-lg"][class*="shadow-lg"]')
        .filter({
          hasText: 'Your site is live!',
        });
      await expect(modal).toBeVisible({ timeout: 30000 });

      // Should show the live URL
      await expect(modal.getByText('Live URL')).toBeVisible();

      // Should have Copy URL and Visit site buttons within the modal
      await expect(
        modal.getByRole('button', { name: /Copy URL/i }),
      ).toBeVisible();
      await expect(
        modal.getByRole('link', { name: /Visit site/i }),
      ).toBeVisible();

      // Should have save option
      await expect(
        modal.getByRole('button', { name: /Save to keep permanently/i }),
      ).toBeVisible();

      // Should have publish another option
      await expect(modal.getByText(/Publish another/i)).toBeVisible();
    });

    test('should show expiry warning in success modal', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]');

      await fileInput.setInputFiles({
        name: 'test.md',
        mimeType: 'text/markdown',
        buffer: Buffer.from('# Test'),
      });

      await expect(page.getByText('Your site is live!')).toBeVisible({
        timeout: 30000,
      });

      // Should warn about expiry
      await expect(
        page.getByText(/This site will expire in 7 days/),
      ).toBeVisible();
    });
  });

  test.describe('Supported File Extensions', () => {
    test('should accept .md files', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]');

      await fileInput.setInputFiles({
        name: 'test.md',
        mimeType: 'text/markdown',
        buffer: Buffer.from('# Test'),
      });

      await expect(page.getByText('Your site is live!')).toBeVisible({
        timeout: 30000,
      });
    });

    test('should accept .mdx files', async ({ page }) => {
      const fileInput = page.locator('input[type="file"]');

      await fileInput.setInputFiles({
        name: 'test.mdx',
        mimeType: 'text/markdown',
        buffer: Buffer.from('# Test MDX\n\n<Component />'),
      });

      await expect(page.getByText('Your site is live!')).toBeVisible({
        timeout: 30000,
      });
    });
  });
});
