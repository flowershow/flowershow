// Browsers get Cache-Control; the CDN in front of the app (Vercel)
// honours CDN-Cache-Control, so cards are cached at the edge for as long.
const LONG = {
  browser: 'public, max-age=31536000, immutable',
  cdn: 'max-age=31536000',
};
const SHORT = { browser: 'public, max-age=300', cdn: 'max-age=300' };

/** A rendered card; `complete` is false when its picture or logo couldn't be loaded. */
export type RenderedCard = { body: ArrayBuffer; complete: boolean };

const jpeg = (body: ArrayBuffer, cache: typeof LONG) =>
  new Response(body, {
    status: 200,
    headers: {
      'content-type': 'image/jpeg',
      'cache-control': cache.browser,
      'cdn-cache-control': cache.cdn,
    },
  });

/**
 * Cache policy + fallbacks for /_og. Long cache only for a correct `v` and a
 * complete render; anything else gets a short cache so it self-heals (a
 * picture that timed out is retried within minutes, not kept for a year). A
 * missing page is the site card (200), so the route never confirms a page exists.
 */
export async function socialCardResponse(a: {
  expectedVersion: string;
  requestedVersion: string | null;
  renderPage: (() => Promise<RenderedCard>) | null;
  renderSite: () => Promise<RenderedCard>;
  fallbackUrl: string;
}): Promise<Response> {
  const versionOk = a.requestedVersion === a.expectedVersion;
  try {
    const card = await (a.renderPage ?? a.renderSite)();
    return jpeg(card.body, versionOk && card.complete ? LONG : SHORT);
  } catch (err) {
    console.error('[og] card render failed', err);
  }
  try {
    return jpeg((await a.renderSite()).body, SHORT);
  } catch (err) {
    console.error('[og] site card render failed', err);
  }
  return Response.redirect(a.fallbackUrl, 302);
}
