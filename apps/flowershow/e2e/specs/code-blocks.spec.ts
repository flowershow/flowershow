import { expect, test } from '@playwright/test';

const TEST_USER = process.env.GH_E2E_TEST_ACCOUNT || 'e2e-testuser';
const TEST_PROJECT = 'e2e-test-site';
const BASE_PATH = `/@${TEST_USER}/${TEST_PROJECT}`;

test.describe('Code Blocks', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_PATH}/code-blocks`);
  });

  test('renders fenced code blocks', async ({ page }) => {
    const content = page.locator('#mdxpage');
    const codeBlocks = content.locator('pre');
    await expect(codeBlocks).toHaveCount(3);
  });

  test('code blocks contain expected content', async ({ page }) => {
    const content = page.locator('#mdxpage');
    const jsBlock = content.locator('pre').first();
    await expect(jsBlock).toContainText('function hello()');
    await expect(jsBlock).toContainText('console.log');
  });

  test('code blocks have language-specific syntax highlighting', async ({
    page,
  }) => {
    const content = page.locator('#mdxpage');
    // rehype-prism-plus adds language class to <code> inside <pre>
    const jsCode = content.locator('pre code').first();
    const className = await jsCode.getAttribute('class');
    expect(className).toContain('language-javascript');
  });

  test('renders inline code', async ({ page }) => {
    const content = page.locator('#mdxpage');
    // Inline code is <code> NOT inside <pre>
    const inlineCode = content.locator('p code');
    await expect(inlineCode).toHaveText('inline code');
  });
});
