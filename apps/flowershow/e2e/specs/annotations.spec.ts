import { devices, type Page } from '@playwright/test';
import { expect, test } from '../helpers/fixtures';

const PAGE = '/annotations-demo';
const PILL = /^Annotations on · \d+ notes? · select text to add one$/;

// The page body can stream in after #mdxpage first appears, so keep looking
// until the text is there instead of searching once.
async function selectText(page: Page, needle: string) {
  await page.waitForFunction((text) => {
    const root = document.getElementById('mdxpage');
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

test('A page can opt out with annotations: false', async ({
  page,
  basePath,
}) => {
  // Positive control: the site setting is on, so the sibling page does mount the overlay.
  // Without this, an absent pill could just mean the overlay never loaded.
  await page.goto(`${basePath}${PAGE}`);
  await expect(page.getByRole('button', { name: PILL })).toBeVisible();

  await page.goto(`${basePath}/annotations-off`);
  await expect(page.locator('#mdxpage')).toBeVisible();
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('button', { name: PILL })).toHaveCount(0);
  await expect(
    page.locator('meta[name="robots"][content*="noindex"]'),
  ).toHaveCount(0);
});

test('A visitor annotates; another visitor sees it; the page is noindex', async ({
  page,
  browser,
  basePath,
}, testInfo) => {
  const note = `e2e note ${testInfo.project.name} ${Date.now()}`;
  await page.goto(`${basePath}${PAGE}`);
  await expect(page.getByRole('button', { name: PILL })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    'content',
    /noindex/,
  );

  // Notes from other projects or retries may already be painted, so compare against this baseline.
  const highlightCount = () =>
    page.evaluate(() => CSS.highlights.get('fs-annotation')?.size ?? 0);
  await page.waitForLoadState('networkidle');
  const highlightsBefore = await highlightCount();

  await test.step('select text and save a note', async () => {
    await selectText(page, 'quick brown fox');
    await page.getByRole('button', { name: 'Annotate', exact: true }).click();
    await expect(page.getByLabel('Note', { exact: true })).toBeFocused();
    await page.getByLabel('Note', { exact: true }).fill(note);
    await page.getByLabel('Your name (optional)').fill('E2E Reviewer');
    await page.getByRole('button', { name: 'Save annotation' }).click();
    const panel = page.getByRole('complementary', { name: 'Annotations' });
    await expect(panel).toContainText(note);
    await expect(panel).toContainText('E2E Reviewer');
  });

  await test.step('the annotated text is highlighted', async () => {
    await expect.poll(highlightCount).toBeGreaterThan(highlightsBefore);
  });

  await test.step('the name is remembered for the next note', async () => {
    await selectText(page, 'quick brown fox');
    await page.getByRole('button', { name: 'Annotate', exact: true }).click();
    await expect(page.getByText(/Posting as E2E Reviewer/)).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();
  });

  await test.step('Escape closes the panel; clicking the highlight opens it again', async () => {
    await page.keyboard.press('Escape');
    await expect(
      page.getByRole('complementary', { name: 'Annotations' }),
    ).toHaveCount(0);
    await page
      .getByText('The quick brown fox jumps', { exact: false })
      .first()
      .click({ position: { x: 40, y: 8 } });
    await expect(
      page.getByRole('complementary', { name: 'Annotations' }),
    ).toBeVisible();
  });

  await test.step('a different visitor sees it after a fresh load', async () => {
    const context = await browser.newContext({
      baseURL: testInfo.project.use.baseURL,
    });
    const other = await context.newPage();
    await other.goto(`${basePath}${PAGE}`);
    await other.getByRole('button', { name: PILL }).click();
    await expect(
      other.getByRole('complementary', { name: 'Annotations' }),
    ).toContainText(note);
    await context.close();
  });
});

test.describe('on a phone', () => {
  // devices['Pixel 7'] includes defaultBrowserType, which test.use() rejects inside a describe.
  const { defaultBrowserType, ...pixel7 } = devices['Pixel 7'];
  test.use(pixel7);

  test('Annotate floats above the bottom bars and saves a note', async ({
    page,
    basePath,
  }, testInfo) => {
    const note = `e2e phone note ${testInfo.project.name} ${Date.now()}`;
    await page.goto(`${basePath}${PAGE}`);
    await expect(page.getByRole('button', { name: PILL })).toHaveText(
      /^\d+ notes?$/,
    );
    await selectText(page, 'quick brown fox');
    const sheet = page.getByRole('button', { name: 'Annotate', exact: true });
    await expect(sheet).toHaveClass(/is-touch/);
    const box = await sheet.boundingBox();
    const viewport = page.viewportSize();
    // Above Android's Touch-to-Search bar, below the selection menu area.
    expect(
      box && viewport && viewport.height - (box.y + box.height),
    ).toBeGreaterThan(50);
    await sheet.tap();
    await page.getByLabel('Note', { exact: true }).fill(note);
    await page.getByRole('button', { name: 'Save annotation' }).tap();
    await expect(
      page.getByRole('complementary', { name: 'Annotations' }),
    ).toHaveCount(0); // closes after save on touch
    await page.getByRole('button', { name: PILL }).tap();
    await expect(
      page.getByRole('complementary', { name: 'Annotations' }),
    ).toContainText(note);
  });
});
