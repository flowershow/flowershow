import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mocks must be declared before the imports they affect (vi.mock is hoisted)

vi.mock('@/server/db', () => ({
  default: { site: { findFirst: vi.fn() } },
}));

vi.mock('@/lib/get-site-url', () => ({
  getSiteUrl: vi.fn().mockReturnValue('http://site.test'),
}));

import prisma from '@/server/db';
import { GET } from './route';

const findFirst = prisma.site.findFirst as ReturnType<typeof vi.fn>;

// The site's own host in the test env (NEXT_PUBLIC_SITE_DOMAIN=test.localhost).
const SITE_HOST = 'notes-victim.test.localhost';

function makeReq(host = SITE_HOST): NextRequest {
  return new NextRequest(`http://${host}/api/sitemap/victim/notes`, {
    headers: { host },
  });
}

function makeParams() {
  return { params: Promise.resolve({ user: 'victim', project: 'notes' }) };
}

const passwordSite = {
  id: 'site-1',
  privacyMode: 'PASSWORD',
  tokenVersion: 1,
  userId: 'owner-1',
  subdomain: 'notes-victim',
  customDomain: null,
  updatedAt: new Date(0),
  blobs: [],
  _count: { tags: 0 },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/sitemap — password gate', () => {
  it('returns 404 for a PASSWORD site with no access cookie', async () => {
    findFirst.mockResolvedValue(passwordSite);

    const res = await GET(makeReq(), makeParams());

    expect(res.status).toBe(404);
  });

  it('serves the sitemap for a public site without a cookie', async () => {
    findFirst.mockResolvedValue({ ...passwordSite, privacyMode: 'PUBLIC' });

    const res = await GET(makeReq(), makeParams());

    expect(res.status).toBe(200);
    expect(await res.text()).toContain('<urlset');
  });
});

describe('GET /api/sitemap — output escaping', () => {
  const publicSite = { ...passwordSite, privacyMode: 'PUBLIC' };

  it('escapes a malicious permalink so it cannot inject markup', async () => {
    findFirst.mockResolvedValue({
      ...publicSite,
      blobs: [
        {
          appPath: '/a',
          updatedAt: new Date(0),
          permalink:
            'a</loc></url><x:script xmlns:x="http://www.w3.org/1999/xhtml">alert(1)</x:script><url><loc>b&c',
        },
      ],
    });

    const res = await GET(makeReq(), makeParams());
    const body = await res.text();

    expect(res.status).toBe(200);
    expect(body).not.toContain('<x:script');
    expect(body).not.toContain('</loc></url><');
    expect(body).toContain(
      '<loc>http://site.test/a&lt;/loc&gt;&lt;/url&gt;&lt;x:script xmlns:x=&quot;http://www.w3.org/1999/xhtml&quot;&gt;alert(1)&lt;/x:script&gt;&lt;url&gt;&lt;loc&gt;b&amp;c</loc>',
    );
    // Only the markup we emit is left: one <url> for the home page, one for the blob.
    expect(body.match(/<url>/g)).toHaveLength(2);
    expect(body.match(/<loc>/g)).toHaveLength(2);
  });

  it('sets nosniff', async () => {
    findFirst.mockResolvedValue(publicSite);
    const res = await GET(makeReq(), makeParams());
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
  });
});

describe('GET /api/sitemap — bound to the site own host', () => {
  const publicSite = { ...passwordSite, privacyMode: 'PUBLIC' };

  it.each([
    ['dashboard host', 'cloud.test.localhost'],
    ['bare site domain', 'test.localhost'],
    ["another site's subdomain", 'other-someone.test.localhost'],
    ['another custom domain', 'customer.example.org'],
  ])('redirects a request on the %s to the own host', async (_l, host) => {
    findFirst.mockResolvedValue(publicSite);
    const res = await GET(makeReq(host), makeParams());
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe(`http://${SITE_HOST}/sitemap.xml`);
    expect(await res.text()).not.toContain('<urlset');
  });

  it('serves the sitemap on the site custom domain', async () => {
    findFirst.mockResolvedValue({
      ...publicSite,
      customDomain: 'docs.example.com',
    });
    const res = await GET(makeReq('docs.example.com'), makeParams());
    expect(res.status).toBe(200);
  });
});
