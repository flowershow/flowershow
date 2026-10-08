import type { Request } from '@playwright/test';
import { expect, test } from '../helpers/fixtures';

// Self-hosted fonts (GH #1438). The fixture site publishes fonts/E2EBrand.woff2
// and a custom.css with an @font-face rule that points at it with a
// root-relative URL ('/fonts/E2EBrand.woff2'), plus a second face with a
// relative URL ('fonts/E2EBrand.woff2?relative'). custom.css is linked as a
// same-origin stylesheet at /custom.css, so url() resolves against /custom.css,
// i.e. the site root, whatever page links it. This spec loads a page in a
// subfolder to prove both paths reach the site's own fonts/ folder, follow the
// raw-file redirect to storage, and pass the cross-origin font check there
// (correct Content-Type plus CORS header).
//
// In CI, storage is Adobe S3Mock (.github/workflows/e2e.yml), which sends
// permissive CORS headers by default. So the CORS check here covers the browser
// and the site -> storage redirect chain, NOT the production R2 bucket's CORS
// policy. A regression in the R2 policy will not fail this spec; smoke-test
// production with e.g.
//   curl -sI -H 'Origin: https://example.com' <r2 font url> | grep -i access-control-allow-origin
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
  // Fail fast with a useful message on a 4xx/5xx (e.g. a page-relative path
  // resolving to /subfolder/fonts/... and 404ing) instead of timing out above.
  const fontErrorPromise = new Promise<never>((_, reject) => {
    page.on('response', (r) => {
      if (r.url().includes(FONT_FILE) && r.status() >= 400) {
        reject(new Error(`Font request failed: ${r.status()} ${r.url()}`));
      }
    });
  });
  fontErrorPromise.catch(() => {}); // handled via Promise.race below

  await page.goto(`${basePath}/subfolder/custom-font`);
  const sample = page.locator('.e2e-brand-font');
  await expect(sample).toHaveText('Brand font sample');

  const fontResponse = await Promise.race([
    fontResponsePromise,
    fontErrorPromise,
  ]);

  await test.step('the font URL resolves to the site root, not the page folder', async () => {
    const origin = new URL(firstRequest(fontResponse.request()).url());
    expect(origin.pathname).toBe(`/fonts/${FONT_FILE}`);
  });

  await test.step('storage serves the font with the right type and a CORS header', async () => {
    const headers = await fontResponse.allHeaders();
    expect(headers['content-type']).toContain('font/woff2');
    expect(headers['access-control-allow-origin']).toBeTruthy();
  });

  await test.step('the browser loads the font face', async () => {
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

  await test.step('the sample text renders in the font, not the fallback', async () => {
    const fontFamily = await sample.evaluate(
      (el) => getComputedStyle(el).fontFamily,
    );
    expect(fontFamily).toContain(FONT_FAMILY);

    // Computed style only proves the rule matched. Compare the rendered width
    // with the same text in the monospace fallback to prove the glyphs used
    // come from the loaded face.
    const widths = await sample.evaluate((el) => {
      const fallback = el.cloneNode(true) as HTMLElement;
      fallback.style.fontFamily = 'monospace';
      fallback.style.display = 'inline-block';
      const branded = el.cloneNode(true) as HTMLElement;
      branded.style.display = 'inline-block';
      el.after(branded, fallback);
      const result = {
        branded: branded.getBoundingClientRect().width,
        fallback: fallback.getBoundingClientRect().width,
      };
      branded.remove();
      fallback.remove();
      return result;
    });
    expect(widths.branded).toBeGreaterThan(0);
    expect(widths.branded).not.toBeCloseTo(widths.fallback, 0);
  });
});

test('A relative font URL in custom.css resolves to the site root on a nested page', async ({
  page,
  basePath,
}) => {
  await page.goto(`${basePath}/subfolder/custom-font`);
  await expect(page.locator('.e2e-brand-font')).toHaveText('Brand font sample');

  // Only the relative face's URL carries `?relative`. Before custom.css was a
  // linked stylesheet it was inlined, and this resolved to
  // /subfolder/fonts/... (a 404) on this page.
  // The site's hop (a redirect to storage) is the response for that URL.
  const siteResponsePromise = page.waitForResponse(
    (r) => new URL(r.url()).search === '?relative',
  );
  const loaded = await page.evaluate(async () => {
    const faces = await document.fonts.load("16px 'E2E Brand Relative'");
    return faces.length > 0 && faces.every((f) => f.status === 'loaded');
  });
  const siteResponse = await siteResponsePromise;

  const url = new URL(siteResponse.url());
  expect(url.origin).toBe(new URL(page.url()).origin);
  expect(url.pathname).toBe(`/fonts/${FONT_FILE}`);
  expect(siteResponse.status()).toBeLessThan(400);
  expect(loaded).toBe(true);
});
