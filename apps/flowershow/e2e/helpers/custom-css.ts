import { expect, type Page } from '@playwright/test';

/**
 * Loads `path` and checks the site's custom.css is linked as a same-origin,
 * cached stylesheet (flowershow-isx), not inlined, and that its rules apply.
 * The fixture custom.css (e2e/fixtures/test-site/custom.css) colours
 * `.e2e-custom-css-marker` rgb(1, 2, 3).
 */
export async function expectCustomCssLinked(
  page: Page,
  path: string,
  { cacheScope }: { cacheScope: 'public' | 'private' },
) {
  const cssResponsePromise = page.waitForResponse((r) =>
    new URL(r.url()).pathname.endsWith('/custom.css'),
  );
  await page.goto(path);
  const pageOrigin = new URL(page.url()).origin;

  const link = page.locator(
    'head link[rel="stylesheet"][href^="/custom.css?v="]',
  );
  await expect(link).toHaveCount(1);

  // The fixture CSS is not inlined in the HTML anymore.
  const inlined = await page.evaluate(() =>
    [...document.querySelectorAll('style')].some((s) =>
      s.textContent?.includes('e2e-custom-css-marker'),
    ),
  );
  expect(inlined).toBe(false);

  const res = await cssResponsePromise;
  // Served from the page's own origin with a 200, never redirected (url()
  // paths resolve against the sheet's final URL).
  expect(new URL(res.url()).origin).toBe(pageOrigin);
  expect(res.request().redirectedFrom()).toBeNull();
  expect(res.status()).toBe(200);
  const headers = await res.allHeaders();
  expect(headers['content-type']).toContain('text/css');
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['cache-control']).toContain('immutable');
  expect(headers['cache-control']).toContain(cacheScope);

  const color = await page.evaluate(() => {
    const el = document.createElement('span');
    el.className = 'e2e-custom-css-marker';
    document.body.append(el);
    const c = getComputedStyle(el).color;
    el.remove();
    return c;
  });
  expect(color).toBe('rgb(1, 2, 3)');
}
