import { Prisma } from '@prisma/client';
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mocks must be declared before the imports they affect (vi.mock is hoisted)

vi.mock('@/server/db', () => ({
  default: { site: { findFirst: vi.fn() }, $queryRaw: vi.fn() },
}));

vi.mock('@/lib/get-site-url', () => ({
  getSiteUrl: vi.fn().mockReturnValue('http://site.test'),
}));

import prisma from '@/server/db';
import { GET } from './route';

const findFirst = prisma.site.findFirst as ReturnType<typeof vi.fn>;
const queryRaw = prisma.$queryRaw as unknown as ReturnType<typeof vi.fn>;

/** A Markdown page row as the route's raw query returns it. */
const row = (
  path: string,
  appPath: string | null,
  o: { permalink?: string | null; listed?: boolean; updatedAt?: Date } = {},
) => ({
  path,
  app_path: appPath,
  permalink: o.permalink ?? null,
  updated_at: o.updatedAt ?? new Date(0),
  listed: o.listed ?? true,
});

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
  _count: { tags: 0 },
};

beforeEach(() => {
  vi.clearAllMocks();
  queryRaw.mockResolvedValue([]);
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
    expect(res.headers.get('x-robots-tag')).toBeNull();
  });
});

describe('GET /api/sitemap — anonymous sites', () => {
  const anonSite = {
    ...passwordSite,
    privacyMode: 'PUBLIC',
    isTemporary: true,
    anonymousOwnerId: 'anon-1',
    expiresAt: new Date(Date.now() + 86400000),
  };

  it('serves the sitemap with noindex', async () => {
    findFirst.mockResolvedValue(anonSite);
    const res = await GET(makeReq(), makeParams());
    expect(res.status).toBe(200);
    expect(res.headers.get('x-robots-tag')).toBe('noindex');
  });

  it('returns 404 once the site has expired', async () => {
    findFirst.mockResolvedValue({
      ...anonSite,
      expiresAt: new Date(Date.now() - 1000),
    });
    const res = await GET(makeReq(), makeParams());
    expect(res.status).toBe(404);
  });
});

describe('GET /api/sitemap — output escaping', () => {
  const publicSite = { ...passwordSite, privacyMode: 'PUBLIC' };

  it('escapes a malicious permalink so it cannot inject markup', async () => {
    findFirst.mockResolvedValue(publicSite);
    queryRaw.mockResolvedValue([
      row('a.md', '/a', {
        permalink:
          'a</loc></url><x:script xmlns:x="http://www.w3.org/1999/xhtml">alert(1)</x:script><url><loc>b&c',
      }),
    ]);

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

describe('GET /api/sitemap — drafts', () => {
  const publicSite = { ...passwordSite, privacyMode: 'PUBLIC' };

  it('filters drafts in SQL and lists only listed pages', async () => {
    findFirst.mockResolvedValue(publicSite);
    queryRaw.mockResolvedValue([
      row('a.md', '/a'),
      row('d.md', '/d', { listed: false }),
    ]);

    const body = await (await GET(makeReq(), makeParams())).text();

    expect(body).toContain('<loc>http://site.test/a</loc>');
    expect(body).not.toContain('http://site.test/d<');
    // No page metadata is loaded: the draft check is a JSON path condition
    const [strings, ...values] = queryRaw.mock.calls[0]!;
    const { sql } = Prisma.sql(strings as TemplateStringsArray, ...values);
    expect(sql).toContain(`->>'draft'`);
    expect(sql).not.toMatch(/SELECT[^]*"metadata",/);
  });
});

describe('GET /api/sitemap — generated listing pages', () => {
  const publicSite = { ...passwordSite, privacyMode: 'PUBLIC' };

  it('adds README-less blog/ and posts/ folders, with their newest page as lastmod', async () => {
    findFirst.mockResolvedValue(publicSite);
    queryRaw.mockResolvedValue([
      row('blog/a.md', '/blog/a', { updatedAt: new Date('2026-01-01') }),
      row('blog/2026/b.md', '/blog/2026/b', {
        updatedAt: new Date('2026-02-01'),
      }),
      row('My Blog/posts/p.md', '/My+Blog/posts/p'),
    ]);

    const body = await (await GET(makeReq(), makeParams())).text();

    expect(body).toContain(
      '<loc>http://site.test/blog</loc>\n      <lastmod>2026-02-01T00:00:00.000Z</lastmod>',
    );
    expect(body).toContain('<loc>http://site.test/My+Blog/posts</loc>');
  });

  it('skips folders with an index page, a folder note, or only drafts', async () => {
    findFirst.mockResolvedValue(publicSite);
    queryRaw.mockResolvedValue([
      row('withreadme/blog/README.md', '/withreadme/blog'),
      row('withreadme/blog/c.md', '/withreadme/blog/c'),
      row('fn/blog.md', '/fn/blog', { listed: false }), // a draft folder note still claims the URL
      row('fn/blog/z.md', '/fn/blog/z'),
      row('drafts/blog/x.md', '/drafts/blog/x', { listed: false }),
    ]);

    const body = await (await GET(makeReq(), makeParams())).text();

    expect(
      body.match(/<loc>http:\/\/site\.test\/withreadme\/blog<\/loc>/g),
    ).toHaveLength(1); // the README page itself, not a second generated entry
    expect(body).not.toContain('<loc>http://site.test/fn/blog</loc>');
    expect(body).not.toContain('<loc>http://site.test/drafts/blog</loc>');
  });
});
