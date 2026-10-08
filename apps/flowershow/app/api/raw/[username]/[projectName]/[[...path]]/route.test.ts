import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mocks must be declared before the imports they affect (vi.mock is hoisted)

vi.mock('@/server/db', () => ({
  default: {
    site: { findFirst: vi.fn() },
    blob: { findUnique: vi.fn().mockResolvedValue(null) },
  },
}));

vi.mock('@/lib/anonymous-user', () => ({
  ANONYMOUS_USER_ID: 'anon-user-id',
}));

vi.mock('@/lib/content-store', () => ({
  fetchFile: vi.fn().mockResolvedValue(null),
  generatePresignedGetUrl: vi
    .fn()
    .mockResolvedValue('https://s3.example.com/presigned'),
}));

// Real access check by default; individual tests can grant access.
vi.mock('@/lib/site-access', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/site-access')>();
  return { ...actual, hasSiteAccess: vi.fn(actual.hasSiteAccess) };
});

import { fetchFile, generatePresignedGetUrl } from '@/lib/content-store';
import { customCssVersion } from '@/lib/custom-css';
import { hasSiteAccess } from '@/lib/site-access';
import prisma from '@/server/db';
import { GET } from './route';

const findFirst = prisma.site.findFirst as ReturnType<typeof vi.fn>;
const findBlob = prisma.blob.findUnique as ReturnType<typeof vi.fn>;

// The site's own host in the test env (NEXT_PUBLIC_SITE_DOMAIN=test.localhost).
const SITE_HOST = 'notes-victim.test.localhost';

function makeReq(
  path: string,
  host = SITE_HOST,
  headers: Record<string, string> = {},
): NextRequest {
  return new NextRequest(`http://${host}/api/raw/victim/notes/${path}`, {
    headers: { host, ...headers },
  });
}

function makeParams(path: string) {
  return {
    params: Promise.resolve({
      username: 'victim',
      projectName: 'notes',
      path: path.split('/'),
    }),
  };
}

const passwordSite = {
  id: 'site-1',
  privacyMode: 'PASSWORD',
  tokenVersion: 1,
  userId: 'owner-1',
  subdomain: 'notes-victim',
  customDomain: null,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/raw — password gate', () => {
  it('blocks a non-image file on a PASSWORD site with no access cookie (401)', async () => {
    findFirst.mockResolvedValue(passwordSite);

    const res = await GET(makeReq('secret.md'), makeParams('secret.md'));

    expect(res.status).toBe(401);
    // Never reaches the presigned-URL step for a blocked request.
    expect(generatePresignedGetUrl).not.toHaveBeenCalled();
  });

  it('exempts images so the server-side image optimizer still works (no 401)', async () => {
    findFirst.mockResolvedValue(passwordSite);

    const res = await GET(makeReq('cover.png'), makeParams('cover.png'));

    expect(res.status).toBe(302);
    expect(generatePresignedGetUrl).toHaveBeenCalled();
  });

  it('serves a public site without a cookie (redirect, not blocked)', async () => {
    findFirst.mockResolvedValue({ ...passwordSite, privacyMode: 'PUBLIC' });

    const res = await GET(makeReq('page.md'), makeParams('page.md'));

    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toContain('s3.test.com');
  });
});

// flowershow-2c6: objects uploaded via presigned PUT URLs (CLI, dashboard,
// anonymous publish) carry no Cache-Control, so the storage CDN keeps serving
// old bytes (and deleted files) after a republish. The redirect is uncached,
// so versioning its target by content sha gives every new version a fresh
// CDN cache key, whatever headers the object was uploaded with.
describe('GET /api/raw — public asset redirect is content-versioned', () => {
  const publicSite = { ...passwordSite, privacyMode: 'PUBLIC' };

  it('appends the blob sha so a republished asset gets a new CDN cache key', async () => {
    findFirst.mockResolvedValue(publicSite);
    findBlob.mockResolvedValue({ sha: 'abc123' });

    const res = await GET(
      makeReq('css/style.css'),
      makeParams('css/style.css'),
    );

    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe(
      'http://s3.test.com/site-1/main/raw/css/style.css?v=abc123',
    );
    expect(findBlob).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { siteId_path: { siteId: 'site-1', path: 'css/style.css' } },
      }),
    );
  });

  it('uses a different URL after the content changes', async () => {
    findFirst.mockResolvedValue(publicSite);

    findBlob.mockResolvedValueOnce({ sha: 'v1sha' });
    const before = await GET(makeReq('app.js'), makeParams('app.js'));
    findBlob.mockResolvedValueOnce({ sha: 'v2sha' });
    const after = await GET(makeReq('app.js'), makeParams('app.js'));

    expect(before.headers.get('location')).not.toBe(
      after.headers.get('location'),
    );
  });

  it('falls back to the unversioned URL when no blob row exists yet', async () => {
    findFirst.mockResolvedValue(publicSite);
    findBlob.mockResolvedValue(null);

    const res = await GET(makeReq('new.png'), makeParams('new.png'));

    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe(
      'http://s3.test.com/site-1/main/raw/new.png',
    );
  });

  it('marks the redirect itself as not cacheable', async () => {
    findFirst.mockResolvedValue(publicSite);
    findBlob.mockResolvedValue({ sha: 'abc123' });

    const res = await GET(makeReq('style.css'), makeParams('style.css'));

    expect(res.headers.get('cache-control')).toMatch(/no-cache|max-age=0/);
  });
});

describe('GET /api/raw — anonymous sites', () => {
  const anonSite = {
    id: 'site-anon',
    privacyMode: 'PUBLIC',
    tokenVersion: 1,
    userId: 'anon-user-id',
    isTemporary: true,
    expiresAt: null,
    subdomain: 'notes-victim',
    customDomain: null,
  };

  it('marks the public-file redirect noindex for an anonymous site', async () => {
    findFirst.mockResolvedValue(anonSite);
    const res = await GET(makeReq('page.md'), makeParams('page.md'));
    expect(res.status).toBe(302);
    expect(res.headers.get('x-robots-tag')).toBe('noindex');
  });

  it('marks proxied HTML noindex for an anonymous site', async () => {
    findFirst.mockResolvedValue(anonSite);
    (fetchFile as ReturnType<typeof vi.fn>).mockResolvedValueOnce('<p>hi</p>');
    const res = await GET(makeReq('index.html'), makeParams('index.html'));
    expect(res.status).toBe(200);
    expect(res.headers.get('x-robots-tag')).toBe('noindex');
  });

  it('proxies .htm like .html (rendered on the site, not redirected to storage)', async () => {
    findFirst.mockResolvedValue(anonSite);
    (fetchFile as ReturnType<typeof vi.fn>).mockResolvedValueOnce('<p>hi</p>');
    const res = await GET(makeReq('old.HTM'), makeParams('old.HTM'));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');
  });

  it('marks the presigned redirect noindex for a password-protected anonymous site', async () => {
    findFirst.mockResolvedValue({ ...anonSite, privacyMode: 'PASSWORD' });
    const res = await GET(makeReq('cover.png'), makeParams('cover.png'));
    expect(res.status).toBe(302);
    expect(res.headers.get('x-robots-tag')).toBe('noindex');
  });

  it('does not set x-robots-tag for a normal site (redirect and HTML)', async () => {
    findFirst.mockResolvedValue({ ...anonSite, userId: 'owner-1' });
    const res = await GET(makeReq('page.md'), makeParams('page.md'));
    expect(res.headers.get('x-robots-tag')).toBeNull();

    (fetchFile as ReturnType<typeof vi.fn>).mockResolvedValueOnce('<p>hi</p>');
    const html = await GET(makeReq('index.html'), makeParams('index.html'));
    expect(html.headers.get('x-robots-tag')).toBeNull();
  });

  it('returns 404 for an expired anonymous site', async () => {
    findFirst.mockResolvedValue({
      ...anonSite,
      expiresAt: new Date(Date.now() - 1000),
    });
    const res = await GET(makeReq('page.md'), makeParams('page.md'));
    expect(res.status).toBe(404);
  });

  it('still serves an anonymous site that has not yet expired', async () => {
    findFirst.mockResolvedValue({
      ...anonSite,
      expiresAt: new Date(Date.now() + 60_000),
    });
    const res = await GET(makeReq('page.md'), makeParams('page.md'));
    expect(res.status).toBe(302);
  });
});

// HTML from /api/raw is only served on the site's own host(s); other hosts get
// a redirect to the same file on the site's own host.
describe('GET /api/raw — HTML is bound to the site own host', () => {
  const publicSite = {
    id: 'site-1',
    privacyMode: 'PUBLIC',
    tokenVersion: 1,
    userId: 'owner-1',
    subdomain: 'notes-victim',
    customDomain: 'docs.example.com',
  };
  const fetchFileMock = fetchFile as ReturnType<typeof vi.fn>;

  function expectRedirectToOwnHost(res: Response, pathAndQuery: string) {
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe(
      `http://docs.example.com${pathAndQuery}`,
    );
    expect(res.headers.get('content-type') ?? '').not.toContain('text/html');
    expect(fetchFileMock).not.toHaveBeenCalled();
  }

  beforeEach(() => {
    findFirst.mockResolvedValue(publicSite);
    fetchFileMock.mockResolvedValue('<p>page</p>');
  });

  it('serves HTML on the site subdomain host', async () => {
    const res = await GET(makeReq('x.html'), makeParams('x.html'));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
  });

  it('serves HTML on the site custom domain (case-insensitive host)', async () => {
    const res = await GET(
      makeReq('x.html', 'Docs.Example.com'),
      makeParams('x.html'),
    );
    expect(res.status).toBe(200);
  });

  it("redirects HTML requested on another site's subdomain to the own host", async () => {
    const res = await GET(
      makeReq('x.html', 'other-someone.test.localhost'),
      makeParams('x.html'),
    );
    expectRedirectToOwnHost(res, '/x.html');
  });

  it("redirects HTML requested on another site's custom domain to the own host", async () => {
    const res = await GET(
      makeReq('x.html', 'customer.example.org'),
      makeParams('x.html'),
    );
    expectRedirectToOwnHost(res, '/x.html');
  });

  it.each([
    ['cloud (dashboard) domain', 'cloud.test.localhost'],
    ['root / home / site domain', 'test.localhost'],
    ['a Vercel deployment host', 'flowershow-abc.vercel.app'],
  ])(
    'redirects HTML (and .htm) on the %s to the own host',
    async (_label, host) => {
      for (const file of ['x.html', 'x.HTM']) {
        const res = await GET(makeReq(file, host), makeParams(file));
        expectRedirectToOwnHost(res, `/${file}`);
      }
    },
  );

  it('keeps the encoded path and query string in the redirect', async () => {
    const req = new NextRequest(
      'http://cloud.test.localhost/api/raw/victim/notes/a%20b/c.html?x=1',
      { headers: { host: 'cloud.test.localhost' } },
    );
    const res = await GET(req, {
      params: Promise.resolve({
        username: 'victim',
        projectName: 'notes',
        path: ['a b', 'c.html'],
      }),
    });
    expectRedirectToOwnHost(res, '/a%20b/c.html?x=1');
  });

  it('redirects to the subdomain host when the site has no custom domain', async () => {
    findFirst.mockResolvedValue({ ...publicSite, customDomain: null });
    const res = await GET(
      makeReq('x.html', 'cloud.test.localhost'),
      makeParams('x.html'),
    );
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe(`http://${SITE_HOST}/x.html`);
  });

  it('redirects a password site to its own host before the access check', async () => {
    findFirst.mockResolvedValue({ ...publicSite, privacyMode: 'PASSWORD' });
    const res = await GET(
      makeReq('x.html', 'cloud.test.localhost'),
      makeParams('x.html'),
    );
    expectRedirectToOwnHost(res, '/x.html');
  });

  it('never serves HTML on an app domain, even if a subdomain collides with it', async () => {
    // In the test env cloud.test.localhost is also <"cloud">.<site domain>.
    findFirst.mockResolvedValue({
      ...publicSite,
      subdomain: 'cloud',
      customDomain: null,
    });
    const res = await GET(
      makeReq('x.html', 'cloud.test.localhost'),
      makeParams('x.html'),
    );
    expect(res.status).toBe(404);
    expect(fetchFileMock).not.toHaveBeenCalled();
  });

  it('serves HTML on a Flowershow-owned custom domain (e.g. the home site)', async () => {
    findFirst.mockResolvedValue({
      ...publicSite,
      customDomain: 'home.test.localhost',
    });
    const res = await GET(
      makeReq('x.html', 'home.test.localhost'),
      makeParams('x.html'),
    );
    expect(res.status).toBe(200);
    expect(fetchFileMock).toHaveBeenCalled();
  });

  it('only trusts the Host header', async () => {
    const res = await GET(
      makeReq('x.html', 'cloud.test.localhost', {
        'x-forwarded-host': SITE_HOST,
        'x-original-host': SITE_HOST,
        'x-middleware-rewrite': `http://${SITE_HOST}/api/raw/victim/notes/x.html`,
      }),
      makeParams('x.html'),
    );
    expectRedirectToOwnHost(res, '/x.html');
  });

  it('does not serve HTML when the Host header is missing', async () => {
    const req = new NextRequest('http://localhost/api/raw/victim/notes/x.html');
    req.headers.delete('host');
    const res = await GET(req, makeParams('x.html'));
    expectRedirectToOwnHost(res, '/x.html');
  });

  it('still serves images on any host so the image optimizer keeps working', async () => {
    for (const host of ['cloud.test.localhost', 'test.localhost', SITE_HOST]) {
      const res = await GET(
        makeReq('cover.png', host),
        makeParams('cover.png'),
      );
      expect(res.status).toBe(302);
      expect(res.headers.get('location')).toContain('s3.test.com');
    }
  });

  it('still serves password-site images via presigned URL from a non-site host', async () => {
    findFirst.mockResolvedValue({ ...publicSite, privacyMode: 'PASSWORD' });
    const res = await GET(
      makeReq('cover.png', 'test.localhost'),
      makeParams('cover.png'),
    );
    expect(res.status).toBe(302);
    expect(generatePresignedGetUrl).toHaveBeenCalled();
  });

  it('non-HTML files on a non-site host only redirect to storage (never proxied)', async () => {
    const res = await GET(
      makeReq('page.md', 'cloud.test.localhost'),
      makeParams('page.md'),
    );
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toContain('s3.test.com');
    expect(fetchFileMock).not.toHaveBeenCalled();
  });
});

describe('GET /api/raw/_domain — HTML is bound to the site own host', () => {
  const otherSite = {
    id: 'site-2',
    privacyMode: 'PUBLIC',
    tokenVersion: 1,
    userId: 'owner-2',
    subdomain: 'blog-other',
    customDomain: 'other.example.net',
  };
  const fetchFileMock = fetchFile as ReturnType<typeof vi.fn>;

  function domainReq(host: string, domain: string) {
    return {
      req: new NextRequest(`http://${host}/api/raw/_domain/${domain}/x.html`, {
        headers: { host },
      }),
      params: {
        params: Promise.resolve({
          username: '_domain',
          projectName: domain,
          path: ['x.html'],
        }),
      },
    };
  }

  beforeEach(() => {
    findFirst.mockResolvedValue(otherSite);
    fetchFileMock.mockResolvedValue('<p>page</p>');
  });

  it("does not serve a site's HTML on another site's host", async () => {
    for (const host of [SITE_HOST, 'docs.example.com']) {
      const { req, params } = domainReq(host, 'other.example.net');
      const res = await GET(req, params);
      expect(res.status).toBe(302);
      expect(res.headers.get('location')).toBe(
        'http://other.example.net/x.html',
      );
    }
    expect(fetchFileMock).not.toHaveBeenCalled();
  });

  it('serves the HTML on its own custom domain', async () => {
    const { req, params } = domainReq('other.example.net', 'other.example.net');
    const res = await GET(req, params);
    expect(res.status).toBe(200);
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { customDomain: 'other.example.net' },
      }),
    );
  });
});

// flowershow-isx: the root custom.css is linked from every page as
// /custom.css?v=<content hash> and proxied same-origin with a 200, so url()
// paths in it resolve against the site root and browsers can cache it.
describe('GET /api/raw — custom.css is proxied as a cached stylesheet', () => {
  const CSS = '.marker { color: rgb(1, 2, 3) }';
  const V = customCssVersion(CSS);
  const publicSite = {
    id: 'site-1',
    privacyMode: 'PUBLIC',
    tokenVersion: 1,
    userId: 'owner-1',
    isTemporary: false,
    expiresAt: null,
    subdomain: 'notes-victim',
    customDomain: 'docs.example.com',
  };
  const fetchFileMock = fetchFile as ReturnType<typeof vi.fn>;

  function cssReq(
    query = '',
    host = SITE_HOST,
    headers: Record<string, string> = {},
    path = 'custom.css',
  ) {
    return GET(makeReq(`${path}${query}`, host, headers), makeParams(path));
  }

  beforeEach(() => {
    findFirst.mockResolvedValue(publicSite);
    fetchFileMock.mockResolvedValue(CSS);
  });

  it('serves the CSS with a 200 as text/css + nosniff, immutable when v matches', async () => {
    const res = await cssReq(`?v=${V}`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('text/css; charset=utf-8');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('cache-control')).toBe(
      'public, max-age=31536000, immutable',
    );
    expect(res.headers.get('etag')).toBe(`"${V}"`);
    expect(await res.text()).toBe(CSS);
    expect(fetchFileMock).toHaveBeenCalledWith({
      projectId: 'site-1',
      path: 'custom.css',
    });
    // Public, non-temporary site with a matching v: edge-cached for a day.
    expect(res.headers.get('cdn-cache-control')).toBe('public, max-age=86400');
    expect(res.headers.get('location')).toBeNull();
  });

  it('serves the CSS on the site custom domain too', async () => {
    const res = await cssReq(`?v=${V}`, 'docs.example.com');
    expect(res.status).toBe(200);
  });

  it('does not cache a stale v as immutable, and sends the real ETag', async () => {
    const res = await cssReq('?v=0000000000000000');
    expect(res.status).toBe(200);
    expect(await res.text()).toBe(CSS);
    expect(res.headers.get('cache-control')).toBe(
      'public, max-age=0, must-revalidate',
    );
    expect(res.headers.get('etag')).toBe(`"${V}"`);
    expect(res.headers.get('cdn-cache-control')).toBeNull();
  });

  it('must revalidate when requested without v', async () => {
    const res = await cssReq();
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe(
      'public, max-age=0, must-revalidate',
    );
    expect(res.headers.get('cdn-cache-control')).toBeNull();
  });

  it.each([
    ['matching v', `?v=${V}`],
    ['stale v', '?v=0000000000000000'],
    ['no v', ''],
  ])('answers If-None-Match with a 304 (%s)', async (_label, query) => {
    const res = await cssReq(query, SITE_HOST, {
      'if-none-match': `"${V}"`,
    });
    expect(res.status).toBe(304);
    expect(res.headers.get('etag')).toBe(`"${V}"`);
    expect(await res.text()).toBe('');
    // A 304 is per-client: never edge-cached.
    expect(res.headers.get('cdn-cache-control')).toBeNull();
  });

  it('answers If-None-Match on a password site with a private 304', async () => {
    findFirst.mockResolvedValue({ ...publicSite, privacyMode: 'PASSWORD' });
    vi.mocked(hasSiteAccess).mockResolvedValueOnce(true);
    const res = await cssReq(`?v=${V}`, SITE_HOST, {
      'if-none-match': `"${V}"`,
    });
    expect(res.status).toBe(304);
    expect(res.headers.get('cache-control')).toBe(
      'private, max-age=31536000, immutable',
    );
    expect(res.headers.get('cdn-cache-control')).toBeNull();
  });

  it('does not 304 for an ETag of other content', async () => {
    const res = await cssReq(`?v=${V}`, SITE_HOST, {
      'if-none-match': '"0000000000000000"',
    });
    expect(res.status).toBe(200);
  });

  it('returns an uncacheable 404 when the site has no custom.css', async () => {
    fetchFileMock.mockResolvedValue(null);
    const res = await cssReq(`?v=${V}`);
    expect(res.status).toBe(404);
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(res.headers.get('cdn-cache-control')).toBeNull();
  });

  it('returns an uncacheable 503 (not 404) when storage fails', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    fetchFileMock.mockRejectedValue(new Error('R2 down'));
    const res = await cssReq(`?v=${V}`);
    expect(res.status).toBe(503);
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(res.headers.get('cdn-cache-control')).toBeNull();
    err.mockRestore();
  });

  it('blocks a password site without an access cookie (401)', async () => {
    findFirst.mockResolvedValue({ ...publicSite, privacyMode: 'PASSWORD' });
    const res = await cssReq(`?v=${V}`);
    expect(res.status).toBe(401);
    expect(fetchFileMock).not.toHaveBeenCalled();
  });

  it('serves a password site with access, cached privately only', async () => {
    findFirst.mockResolvedValue({ ...publicSite, privacyMode: 'PASSWORD' });
    vi.mocked(hasSiteAccess).mockResolvedValueOnce(true);
    const res = await cssReq(`?v=${V}`);
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe(
      'private, max-age=31536000, immutable',
    );
    expect(res.headers.get('cdn-cache-control')).toBeNull();
    expect(generatePresignedGetUrl).not.toHaveBeenCalled();
  });

  it('marks an anonymous site noindex and caps caching at its expiry', async () => {
    findFirst.mockResolvedValue({
      ...publicSite,
      userId: 'anon-user-id',
      isTemporary: true,
      expiresAt: new Date(Date.now() + 120_000),
    });
    const res = await cssReq(`?v=${V}`);
    expect(res.status).toBe(200);
    expect(res.headers.get('x-robots-tag')).toBe('noindex');
    const maxAge = Number(
      /max-age=(\d+)/.exec(res.headers.get('cache-control') ?? '')?.[1],
    );
    expect(maxAge).toBeGreaterThan(100);
    expect(maxAge).toBeLessThanOrEqual(120);
    expect(res.headers.get('cdn-cache-control')).toBeNull();
  });

  it('never edge-caches an anonymous site even without an expiry', async () => {
    findFirst.mockResolvedValue({
      ...publicSite,
      userId: 'anon-user-id',
      isTemporary: false,
      expiresAt: null,
    });
    const res = await cssReq(`?v=${V}`);
    expect(res.status).toBe(200);
    expect(res.headers.get('cdn-cache-control')).toBeNull();
  });

  it('keeps the storage redirect on hosts that are not the site own host', async () => {
    findBlob.mockResolvedValue({ sha: 'abc123' });
    for (const host of [
      'cloud.test.localhost',
      'test.localhost',
      'other-someone.test.localhost',
    ]) {
      const res = await cssReq(`?v=${V}`, host);
      expect(res.status).toBe(302);
      expect(res.headers.get('location')).toBe(
        'http://s3.test.com/site-1/main/raw/custom.css?v=abc123',
      );
    }
    expect(fetchFileMock).not.toHaveBeenCalled();
  });

  it.each(['notes/custom.css', 'Custom.css', 'custom.CSS'])(
    'only proxies the root custom.css exactly (%s still redirects)',
    async (path) => {
      const res = await cssReq('', SITE_HOST, {}, path);
      expect(res.status).toBe(302);
      expect(fetchFileMock).not.toHaveBeenCalled();
    },
  );
});
