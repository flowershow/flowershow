import type { Page } from '@playwright/test';
import { expect, test } from '../helpers/fixtures';

// `scripts` frontmatter (Premium, Feature.PageScripts). The fixture pages
// page-scripts.md (site-root path) and page-scripts-mdx.mdx (page-relative
// path) load assets/page-script.js, which counts its runs in
// <html data-page-script-runs> and replaces #page-script-target's text.
//
// The free site (`chromium` project) and the Premium site (`custom-domain`
// project) get the same fixtures, so scripts must run on the Premium site only.
const SCRIPT_FILE = 'page-script.js';
const SCRIPT_SELECTOR = 'script[data-flowershow-page-script]';

const isPremiumProject = () => test.info().project.name === 'custom-domain';

function trackScriptRequests(page: Page) {
  const requests: string[] = [];
  page.on('request', (req) => {
    if (req.url().includes(SCRIPT_FILE)) requests.push(req.url());
  });
  return requests;
}

for (const { name, path } of [
  { name: '.md page', path: '/page-scripts' },
  { name: '.mdx page', path: '/page-scripts-mdx' },
]) {
  test(`page scripts run on every page view (${name})`, async ({
    page,
    basePath,
  }) => {
    test.skip(!isPremiumProject(), 'Page scripts are a Premium feature');

    await test.step('runs on a full page load', async () => {
      await page.goto(`${basePath}${path}`);
      await expect(page.locator('#page-script-target')).toHaveText('enhanced');
      await expect(page.locator('html')).toHaveAttribute(
        'data-page-script-runs',
        '1',
      );
    });

    // Marks this document; it survives only client-side navigation.
    await page.evaluate(() => {
      (window as unknown as { __e2eMarker: boolean }).__e2eMarker = true;
    });

    await test.step('is removed when navigating to another page', async () => {
      await page.locator('nav.site-navbar a', { hasText: 'Home' }).click();
      await expect(page).not.toHaveURL(new RegExp(`${path}$`));
      await expect(page.locator('#page-script-target')).toHaveCount(0);
      await expect(page.locator(SCRIPT_SELECTOR)).toHaveCount(0);
    });

    await test.step('runs again after client-side navigation back', async () => {
      await page.goBack();
      await expect(page.locator('#page-script-target')).toHaveText('enhanced');
      await expect(page.locator('html')).toHaveAttribute(
        'data-page-script-runs',
        '2',
      );
      // Same document, so the navigation really was client-side.
      expect(
        await page.evaluate(
          () => (window as unknown as { __e2eMarker?: boolean }).__e2eMarker,
        ),
      ).toBe(true);
    });
  });
}

test('pages without scripts frontmatter load no page scripts', async ({
  page,
  basePath,
}) => {
  test.skip(!isPremiumProject(), 'Page scripts are a Premium feature');
  const requests = trackScriptRequests(page);

  await page.goto(`${basePath}/frontmatter`);
  await page.waitForLoadState('networkidle');
  await expect(page.locator(SCRIPT_SELECTOR)).toHaveCount(0);
  expect(requests).toEqual([]);
});

test('page scripts are not loaded on the free plan', async ({
  page,
  basePath,
}) => {
  test.skip(isPremiumProject(), 'Only the free site is gated');
  const requests = trackScriptRequests(page);

  await page.goto(`${basePath}/page-scripts`);
  await page.waitForLoadState('networkidle');
  await expect(page.locator('#page-script-target')).toHaveText('static');
  await expect(page.locator(SCRIPT_SELECTOR)).toHaveCount(0);
  expect(requests).toEqual([]);
});
