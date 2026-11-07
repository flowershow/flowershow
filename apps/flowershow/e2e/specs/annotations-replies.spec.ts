import type { Page } from '@playwright/test';
import { expect, test } from '../helpers/fixtures';

const PAGE = '/annotations-demo';
const HINT = 'Select text to comment';
const PANEL = { name: 'Comments' } as const;

// Same as in annotations.spec.ts: the body can stream in, so keep looking.
async function selectText(page: Page, needle: string) {
  await page.waitForFunction((text) => {
    const root = document.getElementById('page-main');
    if (!root) return false;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const index = (node as Text).data.indexOf(text);
      if (index !== -1) {
        const range = document.createRange();
        range.setStart(node, index);
        range.setEnd(node, index + text.length);
        const selection = document.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
        return true;
      }
    }
    return false;
  }, needle);
}

test('A visitor replies to a comment, resolves it and reopens it', async ({
  page,
  basePath,
}, testInfo) => {
  const note = `e2e thread ${testInfo.project.name} ${Date.now()}`;
  const reply = `e2e reply ${testInfo.project.name} ${Date.now()}`;
  await page.goto(`${basePath}${PAGE}`);
  await expect(page.locator('.fs-comments-bar')).toContainText(HINT);
  await page.waitForLoadState('networkidle');

  await selectText(page, 'quick brown fox');
  await page.getByRole('button', { name: 'Comment', exact: true }).click();
  await page.getByLabel('Comment', { exact: true }).fill(note);
  await page.getByRole('button', { name: 'Post', exact: true }).click();
  const panel = page.getByRole('complementary', PANEL);
  const item = panel.locator('li.fs-annotations-item', { hasText: note });
  await expect(item).toBeVisible();

  await test.step('reply', async () => {
    await item.getByRole('button', { name: 'Reply', exact: true }).click();
    await item.getByLabel('Reply', { exact: true }).fill(reply);
    await item.getByRole('button', { name: 'Reply', exact: true }).click();
    await expect(item).toContainText(reply);
  });

  await test.step('resolve moves it under Resolved; reopen brings it back', async () => {
    await item.getByRole('button', { name: 'Resolve', exact: true }).click();
    const resolved = panel.locator('details.fs-annotations-resolved');
    await resolved.locator('summary').click();
    const resolvedItem = resolved.locator('li', { hasText: note });
    await expect(resolvedItem).toContainText('Resolved');
    await expect(resolvedItem).toContainText(reply);
    await resolvedItem.getByRole('button', { name: 'Reopen' }).click();
    await expect(resolved.locator('li', { hasText: note })).toHaveCount(0);
    await expect(item).toBeVisible();
  });
});
