import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/server')>()),
  after: (task: unknown) => (typeof task === 'function' ? task() : task),
}));
vi.mock('next/cache', () => ({
  unstable_cache: (fn: () => unknown) => fn,
  revalidateTag: vi.fn(),
}));
vi.mock('@/lib/cli-auth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/cli-auth')>()),
  validateAccessToken: vi.fn(),
}));
vi.mock('@/lib/content-store', () => ({ fetchFile: vi.fn() }));
vi.mock('@/lib/server-posthog', () => {
  const client = {
    capture: vi.fn(),
    captureException: vi.fn(),
    shutdown: vi.fn().mockResolvedValue(undefined),
  };
  return { default: () => client, __esModule: true };
});
vi.mock('@/server/db', () => ({
  default: {
    site: { findUnique: vi.fn() },
    blob: { findUnique: vi.fn(), findMany: vi.fn() },
    annotation: { findMany: vi.fn(), create: vi.fn(), count: vi.fn() },
  },
}));

import { validateAccessToken } from '@/lib/cli-auth';
import { fetchFile } from '@/lib/content-store';
import PostHogClient from '@/lib/server-posthog';
import prisma from '@/server/db';
import { GET, POST } from './route';

const siteFind = prisma.site.findUnique as ReturnType<typeof vi.fn>;
const blobFind = prisma.blob.findUnique as ReturnType<typeof vi.fn>;
const blobFindMany = prisma.blob.findMany as ReturnType<typeof vi.fn>;
const annFindMany = prisma.annotation.findMany as ReturnType<typeof vi.fn>;
const annCreate = prisma.annotation.create as ReturnType<typeof vi.fn>;
const annCount = prisma.annotation.count as ReturnType<typeof vi.fn>;
const validateToken = validateAccessToken as ReturnType<typeof vi.fn>;
const fetchFileMock = fetchFile as ReturnType<typeof vi.fn>;
const posthog = PostHogClient();

const SITE = {
  id: 'site-1',
  userId: 'owner-1',
  privacyMode: 'PUBLIC',
  tokenVersion: 0,
  configJson: { annotations: true },
  isTemporary: false,
  anonymousOwnerId: null,
  projectName: 'notes',
  customDomain: null,
  subdomain: 'notes-ada',
  user: { username: 'ada' },
};
const ROW = {
  id: 'ann-1',
  siteId: 'site-1',
  path: 'notes/draft.md',
  exact: 'brown fox',
  prefix: 'The quick ',
  suffix: ' jumps',
  startOffset: 10,
  endOffset: 19,
  blobSha: 'sha-a',
  status: 'open',
  resolvedAt: null,
  note: 'Make it red',
  authorName: 'Ada',
  createdAt: new Date('2026-10-03T10:00:00.000Z'),
};
const BODY = {
  path: 'notes/draft.md',
  selector: {
    exact: 'brown fox',
    prefix: 'The quick ',
    suffix: ' jumps',
    start: 10,
    end: 19,
  },
  note: '  Make it red  ',
  authorName: '   ',
};
const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148';

const params = () => ({ params: Promise.resolve({ siteId: 'site-1' }) });
const getReq = (query: string, headers: Record<string, string> = {}) =>
  new NextRequest(`http://localhost/api/sites/id/site-1/annotations${query}`, {
    headers,
  });
const postReq = (body: unknown) =>
  new NextRequest('http://localhost/api/sites/id/site-1/annotations', {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });

beforeEach(() => {
  vi.clearAllMocks();
  siteFind.mockResolvedValue(SITE);
  blobFind.mockResolvedValue({
    metadata: {},
    sha: 'sha-a',
    appPath: '/notes/draft',
  });
  blobFindMany.mockResolvedValue([
    { path: 'notes/draft.md', sha: 'sha-b', appPath: '/notes/draft' },
  ]);
  fetchFileMock.mockResolvedValue(null);
  annFindMany.mockResolvedValue([ROW]);
  annCount.mockResolvedValue(0);
  annCreate.mockImplementation(async ({ data }) => ({
    ...ROW,
    ...data,
    id: 'ann-2',
  }));
});

describe('GET (visitor)', () => {
  it('returns the page annotations when the site setting is on, and records a page view', async () => {
    const res = await GET(
      getReq('?path=notes/draft.md', { 'user-agent': IPHONE }),
      params(),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.annotations[0]).toMatchObject({
      status: 'open',
      pageEdited: false,
    });
    expect(body.annotations[0].pageUrl).toMatch(/\/notes\/draft$/);
    expect(annFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { siteId: 'site-1', path: 'notes/draft.md' },
      }),
    );
    expect(posthog.capture).toHaveBeenCalledWith({
      distinctId: 'site:site-1',
      event: 'annotation_page_viewed',
      properties: {
        siteId: 'site-1',
        device: 'mobile',
        $process_person_profile: false,
      },
    });
  });

  it('honours annotations: true in config.json', async () => {
    siteFind.mockResolvedValue({ ...SITE, configJson: {} });
    fetchFileMock.mockResolvedValue('{"annotations": true}');
    expect((await GET(getReq('?path=notes/draft.md'), params())).status).toBe(
      200,
    );
  });

  it('treats site-level off as final, even with annotations: true in frontmatter', async () => {
    siteFind.mockResolvedValue({ ...SITE, configJson: {} });
    blobFind.mockResolvedValue({
      metadata: { annotations: true },
      sha: 'sha-a',
      appPath: '/notes/draft',
    });
    expect((await GET(getReq('?path=notes/draft.md'), params())).status).toBe(
      404,
    );
    expect(annFindMany).not.toHaveBeenCalled();
  });

  it('404s for a page that opts out, and for a path with no page', async () => {
    blobFind.mockResolvedValueOnce({
      metadata: { annotations: false },
      sha: 'sha-a',
      appPath: '/notes/draft',
    });
    expect((await GET(getReq('?path=notes/draft.md'), params())).status).toBe(
      404,
    );
    blobFind.mockResolvedValueOnce(null);
    expect((await GET(getReq('?path=nope.md'), params())).status).toBe(404);
  });

  it('400s without a path', async () => {
    expect((await GET(getReq(''), params())).status).toBe(400);
  });

  it('never leaks annotations of a password-protected site without the access cookie', async () => {
    siteFind.mockResolvedValue({
      ...SITE,
      privacyMode: 'PASSWORD',
      tokenVersion: 1,
    });
    expect((await GET(getReq('?path=notes/draft.md'), params())).status).toBe(
      404,
    );
    expect(annFindMany).not.toHaveBeenCalled();
  });

  it('normalises a leading slash and spaces in the path', async () => {
    await GET(
      getReq(`?path=${encodeURIComponent('/My Notes/draft one.md')}`),
      params(),
    );
    expect(blobFind).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          siteId_path: { siteId: 'site-1', path: 'My Notes/draft one.md' },
        },
      }),
    );
  });
});

describe('GET (owner token)', () => {
  it('treats a non-Bearer Authorization header (HTTP Basic) as a visitor', async () => {
    const res = await GET(
      getReq('?path=notes/draft.md', { authorization: 'Basic dXNlcjpwdw==' }),
      params(),
    );
    expect(res.status).toBe(200);
    expect(validateToken).not.toHaveBeenCalled();
    expect(annFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { siteId: 'site-1', path: 'notes/draft.md' },
      }),
    );
  });

  it('returns every annotation with pageEdited computed from the current page sha', async () => {
    validateToken.mockResolvedValue({ userId: 'owner-1' });
    const res = await GET(
      getReq('?status=open', { authorization: 'Bearer fs_pat_x' }),
      params(),
    );
    expect(res.status).toBe(200);
    expect(annFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { siteId: 'site-1', status: 'open' } }),
    );
    expect((await res.json()).annotations[0].pageEdited).toBe(true); // sha-a stored, sha-b now
    expect(posthog.capture).toHaveBeenCalledWith(
      expect.objectContaining({
        distinctId: 'owner-1',
        event: 'annotations_pulled',
      }),
    );
  });

  it('403s for another user and 401s for a bad token', async () => {
    validateToken.mockResolvedValueOnce({ userId: 'someone-else' });
    expect(
      (await GET(getReq('', { authorization: 'Bearer fs_pat_x' }), params()))
        .status,
    ).toBe(403);
    validateToken.mockResolvedValueOnce(null);
    expect(
      (await GET(getReq('', { authorization: 'Bearer nope' }), params()))
        .status,
    ).toBe(401);
  });
});

describe('POST', () => {
  it('415s a non-JSON content type (text/plain cross-site posts) without writing', async () => {
    const req = new NextRequest(
      'http://localhost/api/sites/id/site-1/annotations',
      {
        method: 'POST',
        body: JSON.stringify(BODY),
        headers: { 'content-type': 'text/plain' },
      },
    );
    const res = await POST(req, params());
    expect(res.status).toBe(415);
    expect((await res.json()).error).toBe('unsupported_media_type');
    expect(annCreate).not.toHaveBeenCalled();
  });

  it('creates an annotation with a trimmed note, no name, the page sha and no IP', async () => {
    const res = await POST(postReq(BODY), params());
    expect(res.status).toBe(201);
    expect(annCreate).toHaveBeenCalledWith({
      data: {
        siteId: 'site-1',
        path: 'notes/draft.md',
        exact: 'brown fox',
        prefix: 'The quick ',
        suffix: ' jumps',
        startOffset: 10,
        endOffset: 19,
        blobSha: 'sha-a',
        note: 'Make it red',
        authorName: null,
      },
    });
    expect(posthog.capture).toHaveBeenCalledWith(
      expect.objectContaining({
        distinctId: 'site:site-1',
        event: 'annotation_created',
        properties: expect.objectContaining({ siteId: 'site-1' }),
      }),
    );
  });

  it('rejects empty notes, over-long fields and offsets that do not span the quote', async () => {
    expect(
      (await POST(postReq({ ...BODY, note: '  ' }), params())).status,
    ).toBe(400);
    expect(
      (await POST(postReq({ ...BODY, authorName: 'x'.repeat(61) }), params()))
        .status,
    ).toBe(400);
    expect(
      (await POST(postReq({ ...BODY, note: 'x'.repeat(2001) }), params()))
        .status,
    ).toBe(400);
    expect(
      (
        await POST(
          postReq({ ...BODY, selector: { ...BODY.selector, end: 25 } }),
          params(),
        )
      ).status,
    ).toBe(400);
    expect(annCreate).not.toHaveBeenCalled();
  });

  it('413s on a body over 16 KB', async () => {
    expect(
      (
        await POST(
          postReq(JSON.stringify({ ...BODY, padding: 'x'.repeat(17000) })),
          params(),
        )
      ).status,
    ).toBe(413);
  });

  it('409s when the page or site is at its cap', async () => {
    annCount.mockResolvedValueOnce(500).mockResolvedValueOnce(500);
    const res = await POST(postReq(BODY), params());
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe('limit_reached');
    expect(annCreate).not.toHaveBeenCalled();
  });

  it('404s when off, on a password site without the cookie, and on an unclaimed anonymous site', async () => {
    siteFind.mockResolvedValueOnce({ ...SITE, configJson: {} });
    expect((await POST(postReq(BODY), params())).status).toBe(404);
    siteFind.mockResolvedValueOnce({
      ...SITE,
      privacyMode: 'PASSWORD',
      tokenVersion: 1,
    });
    expect((await POST(postReq(BODY), params())).status).toBe(404);
    siteFind.mockResolvedValueOnce({
      ...SITE,
      isTemporary: true,
      anonymousOwnerId: 'anon-1',
    });
    expect((await POST(postReq(BODY), params())).status).toBe(404);
    expect(annCreate).not.toHaveBeenCalled();
  });

  it('404s on a publish: false page without creating anything', async () => {
    blobFind.mockResolvedValueOnce({
      metadata: { publish: false },
      sha: 'sha-a',
      appPath: '/notes/draft',
    });
    expect((await POST(postReq(BODY), params())).status).toBe(404);
    expect(annCreate).not.toHaveBeenCalled();
  });
});

describe('GET (visitor, unpublished page)', () => {
  it('404s on a publish: false page without querying annotations', async () => {
    blobFind.mockResolvedValueOnce({
      metadata: { publish: false },
      sha: 'sha-a',
      appPath: '/notes/draft',
    });
    expect((await GET(getReq('?path=notes/draft.md'), params())).status).toBe(
      404,
    );
    expect(annFindMany).not.toHaveBeenCalled();
  });
});
