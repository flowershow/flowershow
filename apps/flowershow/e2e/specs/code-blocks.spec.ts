import { expect, test } from '@playwright/test';
import { BASE_PATH } from '../helpers/seed';

test('Code Blocks', async ({ page }) => {
  await page.goto(`${BASE_PATH}/code-blocks`);
  const content = page.locator('#mdxpage');

  await test.step('renders fenced code blocks', async () => {
    const codeBlocks = content.locator('pre');
    await expect(codeBlocks).toHaveCount(3);
  });

  await test.step('code blocks contain expected content', async () => {
    const jsBlock = content.locator('pre').first();
    await expect(jsBlock).toContainText('function hello()');
    await expect(jsBlock).toContainText('console.log');
  });

  await test.step('code blocks have language-specific syntax highlighting', async () => {
    // rehype-prism-plus adds language class to <code> inside <pre>
    const jsCode = content.locator('pre code').first();
    const className = await jsCode.getAttribute('class');
    expect(className).toContain('language-javascript');
  });

  await test.step('renders inline code', async () => {
    // Inline code is <code> NOT inside <pre>
    const inlineCode = content.locator('p code', { hasText: 'inline code' });
    await expect(inlineCode).toBeVisible();
  });
});
