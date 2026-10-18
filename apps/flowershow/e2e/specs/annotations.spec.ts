import { devices, type Page } from '@playwright/test';
import { expect, test } from '../helpers/fixtures';

const PAGE = '/annotations-demo';
const HINT = 'Select text to comment';
const PANEL = { name: 'Comments' } as const;

// The page body can stream in after <main> first appears, so keep looking
// until the text is there instead of searching once. <main> (#page-main) is the
// annotation root: page header (title, description) plus the Markdown body.
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

test('A page can opt out with annotations: false', async ({
  page,
  basePath,
}) => {
  // Positive control: the site setting is on, so the sibling page does mount the bar.
  // Without this, an absent bar could just mean the overlay never loaded.
  await page.goto(`${basePath}${PAGE}`);
  await expect(page.locator('.fs-comments-bar')).toContainText(HINT);

  await page.goto(`${basePath}/annotations-off`);
  await expect(page.locator('#mdxpage')).toBeVisible();
  await page.waitForLoadState('networkidle');
  await expect(page.locator('.fs-comments-bar')).toHaveCount(0);
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
  await expect(page.locator('.fs-comments-bar')).toContainText(HINT);
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
    await page.getByRole('button', { name: 'Comment', exact: true }).click();
    await expect(page.getByLabel('Comment', { exact: true })).toBeFocused();
    await page.getByLabel('Comment', { exact: true }).fill(note);
    await page.getByLabel('Your name (optional)').fill('E2E Reviewer');
    await page.getByRole('button', { name: 'Post', exact: true }).click();
    const panel = page.getByRole('complementary', PANEL);
    await expect(panel).toContainText(note);
    await expect(panel).toContainText('E2E Reviewer');
  });

  await test.step('the annotated text is highlighted', async () => {
    await expect.poll(highlightCount).toBeGreaterThan(highlightsBefore);
  });

  await test.step('the name is remembered for the next note', async () => {
    await selectText(page, 'quick brown fox');
    await page.getByRole('button', { name: 'Comment', exact: true }).click();
    await expect(page.getByText(/Posting as E2E Reviewer/)).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();
  });

  await test.step('Escape closes the panel; clicking the highlight opens it again', async () => {
    await page.keyboard.press('Escape');
    await expect(page.getByRole('complementary', PANEL)).toHaveCount(0);
    // Focus goes back to the bar's toggle (1pr.6).
    await expect(
      page.getByRole('button', { name: 'Show comments' }),
    ).toBeFocused();
    await page
      .getByText('The quick brown fox jumps', { exact: false })
      .first()
      .click({ position: { x: 40, y: 8 } });
    await expect(page.getByRole('complementary', PANEL)).toBeVisible();
    await expect(
      page.getByRole('complementary', PANEL).locator('.is-focused'),
    ).toHaveCount(1);
  });

  await test.step('a phrase in the page description can be annotated', async () => {
    await selectText(page, 'Header text counts');
    await page.getByRole('button', { name: 'Comment', exact: true }).click();
    await expect(
      page.locator('form.fs-annotations-form .fs-annotations-quote'),
    ).toHaveText('Header text counts');
    await page.getByRole('button', { name: 'Cancel' }).click();
    await page.keyboard.press('Escape');
  });

  await test.step('a different visitor sees it after a fresh load', async () => {
    const context = await browser.newContext({
      baseURL: testInfo.project.use.baseURL,
    });
    const other = await context.newPage();
    await other.goto(`${basePath}${PAGE}`);
    await other.getByRole('button', { name: 'Show comments' }).click();
    await expect(other.getByRole('complementary', PANEL)).toContainText(note);
    await context.close();
  });
});

test('At 1440px the bar sticks under the navbar and the open panel sits beside the text', async ({
  page,
  basePath,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${basePath}${PAGE}`);
  const bar = page.locator('.fs-comments-bar');
  await expect(bar).toContainText(HINT);
  await page.waitForLoadState('networkidle');

  // Make sure there is a comment, so the bar has its toggle.
  if (
    (await page.getByRole('button', { name: 'Show comments' }).count()) === 0
  ) {
    await selectText(page, 'quick brown fox');
    await page.getByRole('button', { name: 'Comment', exact: true }).click();
    await page.getByLabel('Comment', { exact: true }).fill('layout check');
    await page.getByRole('button', { name: 'Post', exact: true }).click();
    await expect(page.getByRole('complementary', PANEL)).toContainText(
      'layout check',
    );
  } else {
    await page.getByRole('button', { name: 'Show comments' }).click();
  }

  const panel = page.getByRole('complementary', PANEL);
  await expect(panel).toBeVisible();
  const panelBox = (await panel.boundingBox())!;
  const textBox = (await page.locator('#page-main').boundingBox())!;
  expect(textBox.x + textBox.width).toBeLessThanOrEqual(panelBox.x);
  // The "Built with Flowershow" badge (free sites) moves left of the panel.
  const badge = page.locator('#built-with-button');
  if (await badge.count()) {
    await expect
      .poll(async () => {
        const box = (await badge.boundingBox())!;
        return box.x + box.width <= panelBox.x;
      })
      .toBe(true);
  }

  const barTopBefore = (await bar.boundingBox())!.y;
  await page.mouse.wheel(0, 800);
  await expect
    .poll(async () => (await bar.boundingBox())!.y)
    .toBeLessThanOrEqual(barTopBefore);
  const navBottom = await page.evaluate(() => {
    const nav = document.querySelector('.site-navbar');
    return nav ? nav.getBoundingClientRect().bottom : 0;
  });
  expect(Math.round((await bar.boundingBox())!.y)).toBe(Math.round(navBottom));

  await page.getByRole('button', { name: 'Hide comments' }).click();
  await expect(panel).toHaveCount(0);
  if (await badge.count())
    await expect
      .poll(async () => (await badge.boundingBox())!.x)
      .toBeGreaterThan(panelBox.x);
  expect(
    await page.evaluate(() =>
      document.documentElement.classList.contains('fs-comments-open'),
    ),
  ).toBe(false);
});

test.describe('on a phone', () => {
  // devices['Pixel 7'] includes defaultBrowserType, which test.use() rejects inside a describe.
  const { defaultBrowserType, ...pixel7 } = devices['Pixel 7'];
  test.use(pixel7);

  test('Comment floats above the bottom bars and saves a note', async ({
    page,
    basePath,
  }, testInfo) => {
    const note = `e2e phone note ${testInfo.project.name} ${Date.now()}`;
    await page.goto(`${basePath}${PAGE}`);
    await expect(page.locator('.fs-comments-bar')).toBeVisible();
    await selectText(page, 'quick brown fox');
    const sheet = page.getByRole('button', { name: 'Comment', exact: true });
    await expect(sheet).toHaveClass(/is-touch/);
    const box = await sheet.boundingBox();
    const viewport = page.viewportSize();
    // Above Android's Touch-to-Search bar, below the selection menu area.
    expect(
      box && viewport && viewport.height - (box.y + box.height),
    ).toBeGreaterThan(50);
    await sheet.tap();
    await page.getByLabel('Comment', { exact: true }).fill(note);
    await page.getByRole('button', { name: 'Post', exact: true }).tap();
    await expect(page.getByRole('dialog', PANEL)).toHaveCount(0); // closes after save on touch
    // The Next.js dev-only overlay badge can sit over page controls on a
    // phone-sized viewport and swallow taps; it doesn't exist in production.
    await page.evaluate(() => {
      for (const el of document.querySelectorAll('nextjs-portal')) el.remove();
    });
    await page.evaluate(() => window.scrollTo(0, 0)); // the bar isn't sticky on phones
    await page.getByRole('button', { name: 'Show comments' }).tap();
    const sheet = page.getByRole('dialog', PANEL);
    await expect(sheet).toContainText(note);
    // A bottom sheet, not a full-height panel: the top of the page stays visible.
    const sheetBox = await sheet.boundingBox();
    expect(sheetBox && viewport && sheetBox.y).toBeGreaterThan(
      viewport!.height * 0.3,
    );
    expect(sheetBox && viewport && sheetBox.y + sheetBox.height).toBeCloseTo(
      viewport!.height,
      0,
    );
    await page.getByRole('button', { name: 'Close comments' }).tap();
    await expect(sheet).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: 'Show comments' }),
    ).toBeFocused();
  });

  test('tapping a highlight opens the sheet with the passage visible above it', async ({
    page,
    basePath,
  }) => {
    await page.goto(`${basePath}${PAGE}`);
    await page.waitForLoadState('networkidle');
    await expect
      .poll(() =>
        page.evaluate(() => CSS.highlights.get('fs-annotation')?.size ?? 0),
      )
      .toBeGreaterThan(0);
    await page.evaluate(() => {
      for (const el of document.querySelectorAll('nextjs-portal')) el.remove();
    });
    // Tap the middle of the first highlighted passage.
    const point = await page.evaluate(() => {
      const highlight = CSS.highlights.get('fs-annotation');
      const range = highlight && ([...highlight][0] as Range);
      range?.startContainer.parentElement?.scrollIntoView({
        block: 'end',
        behavior: 'instant',
      });
      const rect = range?.getClientRects()[0];
      return (
        rect && { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }
      );
    });
    expect(point).toBeTruthy();
    await page.touchscreen.tap(point!.x, point!.y);
    const sheet = page.getByRole('dialog', PANEL);
    await expect(sheet).toBeVisible();
    await expect(sheet.locator('.is-focused')).toHaveCount(1);
    // The passage is scrolled into the part of the screen above the sheet.
    await expect
      .poll(async () => {
        const sheetTop = (await sheet.boundingBox())?.y ?? 0;
        const passageBottom = await page.evaluate(() => {
          const range = [
            ...(CSS.highlights.get('fs-annotation-active') ?? []),
          ][0] as Range | undefined;
          return range?.getBoundingClientRect().bottom ?? Infinity;
        });
        return passageBottom < sheetTop && passageBottom > 0;
      })
      .toBe(true);
  });
});
