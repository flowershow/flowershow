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
    annotation: { findFirst: vi.fn() },
    annotationReply: { count: vi.fn(), create: vi.fn() },
  },
}));

import { validateAccessToken } from '@/lib/cli-auth';
import PostHogClient from '@/lib/server-posthog';
import prisma from '@/server/db';
import { POST } from './route';

const siteFind = prisma.site.findUnique as ReturnType<typeof vi.fn>;
const blobFind = prisma.blob.findUnique as ReturnType<typeof vi.fn>;
const blobFindMany = prisma.blob.findMany as ReturnType<typeof vi.fn>;
const annFindFirst = prisma.annotation.findFirst as ReturnType<typeof vi.fn>;
const replyCount = prisma.annotationReply.count as ReturnType<typeof vi.fn>;
const replyCreate = prisma.annotationReply.create as ReturnType<typeof vi.fn>;
const validateToken = validateAccessToken as ReturnType<typeof vi.fn>;
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

const params = (siteId = 'site-1') => ({
  params: Promise.resolve({ siteId, annotationId: 'ann-1' }),
});
const postReq = (
  body: unknown,
  headers: Record<string, string> = {},
  contentType = 'application/json',
) =>
  new NextRequest(
    'http://localhost/api/sites/id/site-1/annotations/ann-1/replies',
    {
      method: 'POST',
      body: typeof body === 'string' ? body : JSON.stringify(body),
      headers: { 'content-type': contentType, ...headers },
    },
  );

beforeEach(() => {
  vi.clearAllMocks();
  siteFind.mockResolvedValue(SITE);
  annFindFirst.mockResolvedValue({ id: 'ann-1', path: 'notes/draft.md' });
  blobFind.mockResolvedValue({
    metadata: {},
    sha: 'sha-a',
    appPath: '/notes/draft',
  });
  blobFindMany.mockResolvedValue([]);
  replyCount.mockResolvedValue(0);
  replyCreate.mockImplementation(async ({ data }) => ({
    id: 'rep-1',
    authorName: null,
    createdAt: new Date('2026-11-07T10:00:00.000Z'),
    ...data,
  }));
});

describe('POST replies', () => {
  it('creates a reply anonymously when the page is open, not by the owner', async () => {
    const res = await POST(
      postReq({ note: '  Agreed  ', authorName: ' Maya ' }),
      params(),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.reply).toMatchObject({
      note: 'Agreed',
      authorName: 'Maya',
      byOwner: false,
    });
    expect(replyCreate).toHaveBeenCalledWith({
      data: {
        annotationId: 'ann-1',
        note: 'Agreed',
        authorName: 'Maya',
        byOwner: false,
      },
    });
    expect(validateToken).not.toHaveBeenCalled();
    expect(posthog.capture).toHaveBeenCalledWith({
      distinctId: 'site:site-1',
      event: 'annotation_reply_created',
      properties: {
        siteId: 'site-1',
        byOwner: false,
        device: 'desktop',
        $process_person_profile: false,
      },
    });
  });

  it('looks the annotation up by id and site, so another site id is a 404', async () => {
    annFindFirst.mockResolvedValue(null);
    const res = await POST(postReq({ note: 'Hi' }), params());
    expect(res.status).toBe(404);
    expect(annFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'ann-1', siteId: 'site-1' } }),
    );
    expect(replyCreate).not.toHaveBeenCalled();
  });

  it('is a 404 when annotations are off for the page', async () => {
    siteFind.mockResolvedValue({ ...SITE, configJson: {} });
    const res = await POST(postReq({ note: 'Hi' }), params());
    expect(res.status).toBe(404);
    expect(replyCreate).not.toHaveBeenCalled();
  });

  it('is a 404 when the page no longer exists', async () => {
    blobFind.mockResolvedValue(null);
    expect((await POST(postReq({ note: 'Hi' }), params())).status).toBe(404);
  });

  it('marks byOwner with a valid owner token, even if annotations are off', async () => {
    validateToken.mockResolvedValue({ userId: 'owner-1' });
    siteFind.mockResolvedValue({ ...SITE, configJson: {} });
    const res = await POST(
      postReq({ note: 'Fixed' }, { authorization: 'Bearer pat' }),
      params(),
    );
    expect(res.status).toBe(201);
    expect((await res.json()).reply.byOwner).toBe(true);
  });

  it('treats a bad token as a visitor, not an error', async () => {
    validateToken.mockResolvedValue(null);
    const res = await POST(
      postReq({ note: 'Hi' }, { authorization: 'Bearer nope' }),
      params(),
    );
    expect(res.status).toBe(201);
    expect((await res.json()).reply.byOwner).toBe(false);
  });

  it("does not mark byOwner for someone else's token", async () => {
    validateToken.mockResolvedValue({ userId: 'intruder' });
    const res = await POST(
      postReq({ note: 'Hi' }, { authorization: 'Bearer other' }),
      params(),
    );
    expect(res.status).toBe(201);
    expect((await res.json()).reply.byOwner).toBe(false);
  });

  it('answers 409 limit_reached at 100 replies', async () => {
    replyCount.mockResolvedValue(100);
    const res = await POST(postReq({ note: 'Hi' }), params());
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe('limit_reached');
    expect(replyCreate).not.toHaveBeenCalled();
  });

  it('rejects non-JSON, oversized and invalid bodies', async () => {
    expect(
      (await POST(postReq('note=hi', {}, 'text/plain'), params())).status,
    ).toBe(415);
    expect(
      (await POST(postReq({ note: 'x'.repeat(20000) }), params())).status,
    ).toBe(413);
    expect((await POST(postReq({ note: '   ' }), params())).status).toBe(400);
    expect((await POST(postReq('{nope'), params())).status).toBe(400);
  });
});
