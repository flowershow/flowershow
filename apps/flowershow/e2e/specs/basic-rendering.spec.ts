import { expect, test } from '@playwright/test';

const TEST_USER = process.env.GH_E2E_TEST_ACCOUNT || 'e2e-testuser';
const TEST_PROJECT = 'e2e-test-site';
const BASE_PATH = `/@${TEST_USER}/${TEST_PROJECT}`;

test.describe('Basic Markdown Rendering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_PATH}/basic-syntax`);
  });

  test('renders all heading levels', async ({ page }) => {
    const content = page.locator('#mdxpage');
    await expect(content.locator('h1')).toHaveText('Heading 1');
    await expect(content.locator('h2').first()).toHaveText('Heading 2');
    await expect(content.locator('h3').first()).toHaveText('Heading 3');
    await expect(content.locator('h4')).toHaveText('Heading 4');
    await expect(content.locator('h5')).toHaveText('Heading 5');
    await expect(content.locator('h6')).toHaveText('Heading 6');
  });

  test('renders inline formatting', async ({ page }) => {
    const content = page.locator('#mdxpage');
    await expect(content.locator('strong')).toHaveText('bold text');
    await expect(content.locator('em')).toHaveText('italic text');
    await expect(content.locator('del')).toHaveText('strikethrough text');
  });

  test('renders inline code', async ({ page }) => {
    const content = page.locator('#mdxpage');
    const inlineCode = content.locator('p code').first();
    await expect(inlineCode).toHaveText('inline code');
  });

  test('renders unordered list', async ({ page }) => {
    const content = page.locator('#mdxpage');
    const ul = content.locator('ul').first();
    await expect(ul.locator('> li')).toHaveCount(3);
    await expect(ul.locator('> li').first()).toContainText('Unordered item 1');
    // Check nested item
    await expect(ul.locator('ul > li')).toHaveText('Nested item');
  });

  test('renders ordered list', async ({ page }) => {
    const content = page.locator('#mdxpage');
    const ol = content.locator('ol');
    await expect(ol.locator('> li')).toHaveCount(3);
    await expect(ol.locator('> li').first()).toHaveText('Ordered item 1');
  });

  test('renders blockquote', async ({ page }) => {
    const content = page.locator('#mdxpage');
    const bq = content.locator('blockquote');
    await expect(bq).toContainText('This is a blockquote.');
    await expect(bq).toContainText('It can span multiple lines.');
  });

  test('renders horizontal rule', async ({ page }) => {
    const content = page.locator('#mdxpage');
    await expect(content.locator('hr')).toBeVisible();
  });

  test('renders paragraphs', async ({ page }) => {
    const content = page.locator('#mdxpage');
    await expect(content.locator('p').first()).toContainText('paragraph');
  });
});
