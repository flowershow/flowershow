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

import { fetchFile, generatePresignedGetUrl } from '@/lib/content-store';
import prisma from '@/server/db';
import { GET } from './route';

const findFirst = prisma.site.findFirst as ReturnType<typeof vi.fn>;
const findBlob = prisma.blob.findUnique as ReturnType<typeof vi.fn>;

function makeReq(path: string): NextRequest {
  return new NextRequest(`http://localhost/api/raw/victim/notes/${path}`);
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
