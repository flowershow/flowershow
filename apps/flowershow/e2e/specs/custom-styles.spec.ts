import { expectCustomCssLinked } from '../helpers/custom-css';
import { expect, test } from '../helpers/fixtures';

// custom.css is linked from every page as /custom.css?v=<content hash> on the
// page's own origin and proxied with a 200, so the browser caches it and url()
// paths resolve against the site root (flowershow-isx).
//
// Runs on the free subdomain site (`chromium`) and on the custom-domain site
// (`custom-domain`, see playwright.config.ts). Password sites are covered in
// password-protection.spec.ts.

test('custom.css is a cached same-origin stylesheet on a nested page', async ({
  page,
  basePath,
}) => {
  await expectCustomCssLinked(page, `${basePath}/subfolder/nested-page`, {
    cacheScope: 'public',
  });
});

test('a stale or missing version is served but not cached as immutable', async ({
  page,
  basePath,
}) => {
  await page.goto(`${basePath}/`);
  const href = await page
    .locator('head link[rel="stylesheet"][href^="/custom.css?v="]')
    .getAttribute('href');
  expect(href).toBeTruthy();

  const fresh = await page.request.get(`${basePath}${href}`);
  expect(fresh.status()).toBe(200);
  const etag = fresh.headers().etag;
  expect(etag).toBeTruthy();

  for (const url of ['/custom.css?v=0000000000000000', '/custom.css']) {
    const res = await page.request.get(`${basePath}${url}`);
    expect(res.status(), url).toBe(200);
    expect(res.headers()['cache-control'], url).toContain('must-revalidate');
    expect(res.headers().etag, url).toBe(etag);
  }

  const revalidated = await page.request.get(`${basePath}/custom.css`, {
    headers: { 'If-None-Match': etag },
  });
  expect(revalidated.status()).toBe(304);
});
