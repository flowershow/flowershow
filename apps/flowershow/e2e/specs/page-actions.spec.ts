import { expect, test } from '../helpers/fixtures';

test.describe('Page actions menu', () => {
  test('copies the page as Markdown and links to ChatGPT and Claude', async ({
    page,
    context,
    basePath,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto(`${basePath}/basic-syntax`);

    const actions = page.locator('.page-header-actions .page-actions');
    await expect(actions).toBeVisible();

    await test.step('Copy page puts the Markdown on the clipboard', async () => {
      await actions.getByRole('button', { name: /Copy page/ }).click();
      await expect(actions).toContainText('Copied');
      const copied = await page.evaluate(() => navigator.clipboard.readText());
      expect(copied).toContain('title: Basic Syntax');
    });

    await test.step('the menu links to the .md and the AI chats', async () => {
      await actions.getByRole('button', { name: 'More page actions' }).click();
      await expect(
        page.getByRole('menuitem', { name: /View as Markdown/ }),
      ).toHaveAttribute('href', '/basic-syntax.md');

      const prompt = (href: string | null) =>
        new URL(href ?? '', 'https://x.test').searchParams.get('q');
      const chatgpt = await page
        .getByRole('menuitem', { name: /Open in ChatGPT/ })
        .getAttribute('href');
      expect(chatgpt).toMatch(/^https:\/\/chatgpt\.com\/\?q=/);
      expect(prompt(chatgpt)).toMatch(
        /^Read https?:\/\/\S+\/basic-syntax\.md and help me with it\.$/,
      );
      const claude = await page
        .getByRole('menuitem', { name: /Open in Claude/ })
        .getAttribute('href');
      expect(claude).toMatch(/^https:\/\/claude\.ai\/new\?q=/);
      expect(prompt(claude)).toBe(prompt(chatgpt));
    });
  });

  test('a folder README page links its README source', async ({
    page,
    basePath,
  }) => {
    await page.goto(`${basePath}/docs`);
    await page
      .locator('.page-actions')
      .getByRole('button', { name: 'More page actions' })
      .click();
    await expect(
      page.getByRole('menuitem', { name: /View as Markdown/ }),
    ).toHaveAttribute('href', '/docs/README.md');
  });
});
