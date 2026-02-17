import { expect, type Locator, test } from '../helpers/fixtures';

test('Basic Markdown Rendering', async ({ page, basePath }) => {
  await page.goto(`${basePath}/basic-syntax`);
  const content = page.locator('#mdxpage');

  await test.step('renders inline formatting', async () => {
    await expect(content.locator('strong')).toHaveText('bold text');
    await expect(content.locator('em')).toHaveText('italic text');
    await expect(content.locator('del')).toHaveText('strikethrough text');
  });

  await test.step('renders inline code', async () => {
    const inlineCode = content.locator('p code', { hasText: 'inline code' });
    await expect(inlineCode).toBeVisible();
  });

  await test.step('renders unordered list', async () => {
    const ul = content.locator('ul').first();
    await expect(ul.locator('> li')).toHaveCount(3);
    await expect(ul.locator('> li').first()).toContainText('Unordered item 1');
    await expect(ul.locator('ul > li')).toHaveText('Nested item');
  });

  await test.step('renders ordered list', async () => {
    const ol = content.locator('ol');
    await expect(ol.locator('> li')).toHaveCount(3);
    await expect(ol.locator('> li').first()).toHaveText('Ordered item 1');
  });

  await test.step('renders blockquote', async () => {
    const bq = content.locator('blockquote');
    await expect(bq).toContainText('This is a blockquote.');
    await expect(bq).toContainText('It can span multiple lines.');
  });

  await test.step('renders horizontal rule', async () => {
    await expect(content.locator('hr')).toBeVisible();
  });

  await test.step('renders paragraphs', async () => {
    await expect(content.locator('p').first()).toContainText('paragraph');
  });
});
