import { describe, expect, it, vi } from 'vitest';
import { socialCardResponse } from './social-card-response';

const png = new Uint8Array([1, 2, 3]).buffer;
const ok = () => vi.fn(async () => png);
const boom = () =>
  vi.fn(async () => {
    throw new Error('render failed');
  });
const LONG = 'public, max-age=31536000, immutable';
const SHORT = 'public, max-age=300';
const CDN_LONG = 'max-age=31536000';
const CDN_SHORT = 'max-age=300';

describe('socialCardResponse (Review Focus 5)', () => {
  it('serves the page card with a long cache when v matches', async () => {
    const res = await socialCardResponse({
      expectedVersion: 'v1',
      requestedVersion: 'v1',
      renderPage: ok(),
      renderSite: ok(),
      fallbackUrl: 'F',
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/png');
    expect(res.headers.get('cache-control')).toBe(LONG);
    expect(res.headers.get('cdn-cache-control')).toBe(CDN_LONG);
  });
  it.each([
    ['stale', 'old'],
    ['missing', null],
    ['forged', 'zzzzzzzzzz'],
  ])('short cache when v is %s', async (_n, v) => {
    const res = await socialCardResponse({
      expectedVersion: 'v1',
      requestedVersion: v,
      renderPage: ok(),
      renderSite: ok(),
      fallbackUrl: 'F',
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe(SHORT);
    expect(res.headers.get('cdn-cache-control')).toBe(CDN_SHORT);
  });
  it('renders the site card when there is no page', async () => {
    const renderSite = ok();
    const res = await socialCardResponse({
      expectedVersion: 'v1',
      requestedVersion: 'v1',
      renderPage: null,
      renderSite,
      fallbackUrl: 'F',
    });
    expect(renderSite).toHaveBeenCalled();
    expect(res.status).toBe(200);
  });
  it('falls back to the site card with a short cache when the page render fails', async () => {
    const renderSite = ok();
    const res = await socialCardResponse({
      expectedVersion: 'v1',
      requestedVersion: 'v1',
      renderPage: boom(),
      renderSite,
      fallbackUrl: 'F',
    });
    expect(renderSite).toHaveBeenCalled();
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe(SHORT);
    expect(res.headers.get('cdn-cache-control')).toBe(CDN_SHORT);
  });
  it('redirects to the static thumbnail when both renders fail', async () => {
    const res = await socialCardResponse({
      expectedVersion: 'v1',
      requestedVersion: 'v1',
      renderPage: boom(),
      renderSite: boom(),
      fallbackUrl: 'https://r2/thumbnail.png',
    });
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('https://r2/thumbnail.png');
  });
});
