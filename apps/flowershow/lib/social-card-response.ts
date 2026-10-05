// Browsers get Cache-Control; the CDN in front of the app (Vercel)
// honours CDN-Cache-Control, so cards are cached at the edge for as long.
const LONG = {
  browser: 'public, max-age=31536000, immutable',
  cdn: 'max-age=31536000',
};
const SHORT = { browser: 'public, max-age=300', cdn: 'max-age=300' };

const png = (body: ArrayBuffer, cache: typeof LONG) =>
  new Response(body, {
    status: 200,
    headers: {
      'content-type': 'image/png',
      'cache-control': cache.browser,
      'cdn-cache-control': cache.cdn,
    },
  });

/**
 * Cache policy + fallbacks for /_og. Long cache only for a correct `v` and a
 * clean render; anything else gets a short cache so it self-heals. A missing
 * page is the site card (200), so the route never confirms a page exists.
 */
export async function socialCardResponse(a: {
  expectedVersion: string;
  requestedVersion: string | null;
  renderPage: (() => Promise<ArrayBuffer>) | null;
  renderSite: () => Promise<ArrayBuffer>;
  fallbackUrl: string;
}): Promise<Response> {
  const cache = a.requestedVersion === a.expectedVersion ? LONG : SHORT;
  try {
    return png(await (a.renderPage ?? a.renderSite)(), cache);
  } catch (err) {
    console.error('[og] card render failed', err);
  }
  try {
    return png(await a.renderSite(), SHORT);
  } catch (err) {
    console.error('[og] site card render failed', err);
  }
  return Response.redirect(a.fallbackUrl, 302);
}
