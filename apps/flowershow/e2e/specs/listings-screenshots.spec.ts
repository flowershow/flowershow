// Opt-in real-page screenshots of the listings demo site (first fold, real
// dark mode, reloaded mobile). Skipped unless LISTING_SCREENSHOTS is set; CI
// runs it only from a manual workflow_dispatch with listing_screenshots: true.
import { test } from '../helpers/fixtures';

test.skip(
  !process.env.LISTING_SCREENSHOTS,
  'set LISTING_SCREENSHOTS=1 to capture',
);
test.use({ viewport: { width: 1440, height: 900 } });

const OUT = 'test-results/listing-screenshots';
const shots: Array<[name: string, url: string, selector?: string]> = [
  ['zero-config-blog', '/blog'],
  ['list-view-page-2', '/blog?page=2'],
  ['prose-readme-auto-listing', '/posts'],
  ['projects-grid', '/projects'],
  ['folder-note', '/writing/blog'],
  ['archive-pagination', '/archive?page=5'],
  ['compact-archive', '/archive'],
  ['grouped-by-month', '/by-month'],
  ['people', '/people'],
  ['team-by-group', '/team'],
  ['magazine', '/magazine'],
  ['magazine-view', '/magazine-view'],
  ['magazine-small', '/magazine-small'],
  ['home-latest-3', '/'],
  ['podcast-where', '/podcast'],
  ['error-card', '/errors', '.list-component-error--block'],
];

for (const [name, url, selector] of shots) {
  test(name, async ({ page }) => {
    await page.goto(url);
    await page.waitForLoadState('networkidle');
    if (selector)
      await page.locator(selector).screenshot({ path: `${OUT}/${name}.png` });
    else await page.screenshot({ path: `${OUT}/${name}.png` }); // first fold, not fullPage
  });
}

test('list-view-dark', async ({ page }) => {
  // The site layout's inline script reads THEME_PREFERENCE_STORAGE_KEY (lib/const.ts).
  await page.addInitScript(() =>
    localStorage.setItem('theme-preference', 'dark'),
  );
  await page.goto('/blog');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: `${OUT}/list-view-dark.png` });
});

test('list-view-mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/blog');
  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: `${OUT}/list-view-mobile.png` });
});
