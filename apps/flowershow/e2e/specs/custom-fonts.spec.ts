import type { Request } from '@playwright/test';
import { expect, test } from '../helpers/fixtures';

// Self-hosted fonts (GH #1438). The fixture site publishes fonts/E2EBrand.woff2
// and a custom.css with an @font-face rule that points at it with a
// root-relative URL ('/fonts/E2EBrand.woff2'). custom.css is inlined into
// every page, so url() resolves against the page URL: this spec loads a page in
// a subfolder to prove the root-relative path still reaches the site's own
// fonts/ folder, follows the raw-file redirect to storage, and passes the
// cross-origin font check there (correct Content-Type plus CORS header).
//
// Runs on the free subdomain site (`chromium`) and on the custom-domain site
// (`custom-domain`, see playwright.config.ts).

const FONT_FILE = 'E2EBrand.woff2';
const FONT_FAMILY = 'E2E Brand';

function firstRequest(request: Request): Request {
  let current = request;
  while (current.redirectedFrom()) {
    current = current.redirectedFrom() as Request;
  }
  return current;
}

test('Self-hosted font from custom.css loads on a nested page', async ({
  page,
  basePath,
}) => {
  // Register before navigating: the font is fetched as soon as the styled
  // element renders. Match only the final 200 hop, not the 302 from the site.
  const fontResponsePromise = page.waitForResponse(
    (r) => r.url().includes(FONT_FILE) && r.status() === 200,
  );

  await page.goto(`${basePath}/subfolder/custom-font`);
  await expect(page.locator('.e2e-brand-font')).toHaveText('Brand font sample');

  const fontResponse = await fontResponsePromise;

  await test.step('the font URL resolves to the site root, not the page folder', async () => {
    const origin = new URL(firstRequest(fontResponse.request()).url());
    expect(origin.pathname).toBe(`/fonts/${FONT_FILE}`);
  });

  await test.step('storage serves the font with the right type and a CORS header', async () => {
    const headers = await fontResponse.allHeaders();
    expect(headers['content-type']).toContain('font/woff2');
    expect(headers['access-control-allow-origin']).toBeTruthy();
  });

  await test.step('the browser loads and applies the font face', async () => {
    const result = await page.evaluate(async (family) => {
      const faces = await document.fonts.load(`16px '${family}'`);
      await document.fonts.ready;
      return {
        loadedFaces: faces.length,
        statuses: faces.map((f) => f.status),
        anyLoaded: [...document.fonts].some(
          (f) =>
            f.family.replace(/["']/g, '') === family && f.status === 'loaded',
        ),
      };
    }, FONT_FAMILY);

    expect(result.anyLoaded).toBe(true);
    expect(result.loadedFaces).toBeGreaterThan(0);
    expect(result.statuses.every((s) => s === 'loaded')).toBe(true);
  });
});
