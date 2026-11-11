import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('./lib/server-posthog', () => ({
  default: () => ({
    getAllFlagsAndPayloads: async () => ({
      featureFlags: { f: true },
      featureFlagPayloads: {},
    }),
  }),
}));

import middleware from './middleware';

// Test env: NEXT_PUBLIC_ROOT_DOMAIN and NEXT_PUBLIC_SITE_DOMAIN are both
// test.localhost (see vitest.setup.ts).
function htmlGet(host: string, path: string) {
  return new NextRequest(`http://${host}${path}`, {
    headers: { host, accept: 'text/html' },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('middleware: PostHog bootstrap cookie only on Flowershow hosts', () => {
  it('sets ph_bootstrap on a Flowershow host (control)', async () => {
    const res = await middleware(htmlGet('test.localhost', '/robots.txt'));
    expect(res.cookies.get('ph_bootstrap')).toBeDefined();
  });

  it('sets no ph_bootstrap on a published subdomain site', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({
          id: 's1',
          projectName: 'notes',
          privacyMode: 'PUBLIC',
          user: { id: 'u1', username: 'rufus' },
        }),
      ),
    );
    const res = await middleware(htmlGet('rufus.test.localhost', '/'));
    expect(res.headers.get('x-middleware-rewrite')).toContain(
      '/site/rufus/notes',
    );
    expect(res.cookies.get('ph_bootstrap')).toBeUndefined();
  });

  it('sets no ph_bootstrap on a custom-domain site', async () => {
    const res = await middleware(htmlGet('example.com', '/robots.txt'));
    expect(res.cookies.get('ph_bootstrap')).toBeUndefined();
  });
});
