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
    annotation: { findFirst: vi.fn(), update: vi.fn() },
  },
}));

import PostHogClient from '@/lib/server-posthog';
import prisma from '@/server/db';
import { POST } from './route';

const siteFind = prisma.site.findUnique as ReturnType<typeof vi.fn>;
const blobFind = prisma.blob.findUnique as ReturnType<typeof vi.fn>;
const annFindFirst = prisma.annotation.findFirst as ReturnType<typeof vi.fn>;
const annUpdate = prisma.annotation.update as ReturnType<typeof vi.fn>;
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
  prefix: '',
  suffix: '',
  startOffset: 10,
  endOffset: 19,
  blobSha: 'sha-a',
  status: 'open',
  resolvedAt: null,
  resolvedBy: null,
  note: 'Make it red',
  authorName: 'Ada',
  createdAt: new Date('2026-10-03T10:00:00.000Z'),
  replies: [
    {
      id: 'rep-1',
      annotationId: 'ann-1',
      note: 'Done',
      authorName: null,
      byOwner: true,
      createdAt: new Date('2026-11-07T10:00:00.000Z'),
    },
  ],
};

const params = () => ({
  params: Promise.resolve({ siteId: 'site-1', annotationId: 'ann-1' }),
});
const postReq = (body: unknown, contentType = 'application/json') =>
  new NextRequest(
    'http://localhost/api/sites/id/site-1/annotations/ann-1/status',
    {
      method: 'POST',
      body: typeof body === 'string' ? body : JSON.stringify(body),
      headers: { 'content-type': contentType },
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
  annUpdate.mockImplementation(async ({ data }) => ({ ...ROW, ...data }));
});

describe('POST status', () => {
  it('resolves with the trimmed name and returns the annotation with replies', async () => {
    const res = await POST(
      postReq({ status: 'resolved', authorName: ' Maya ' }),
      params(),
    );
    expect(res.status).toBe(200);
    const { annotation } = await res.json();
    expect(annotation).toMatchObject({
      id: 'ann-1',
      status: 'resolved',
      resolvedBy: 'Maya',
    });
    expect(annotation.replies).toEqual([
      expect.objectContaining({ id: 'rep-1', byOwner: true, note: 'Done' }),
    ]);
    const data = annUpdate.mock.calls[0]![0].data;
    expect(data).toMatchObject({ status: 'resolved', resolvedBy: 'Maya' });
    expect(data.resolvedAt).toBeInstanceOf(Date);
    expect(posthog.capture).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'annotation_status_changed' }),
    );
  });

  it('resolves with no name as resolvedBy null', async () => {
    await POST(postReq({ status: 'resolved' }), params());
    expect(annUpdate.mock.calls[0]![0].data.resolvedBy).toBeNull();
  });

  it('reopening clears resolvedAt and resolvedBy', async () => {
    await POST(postReq({ status: 'open', authorName: 'Maya' }), params());
    expect(annUpdate.mock.calls[0]![0].data).toEqual({
      status: 'open',
      resolvedAt: null,
      resolvedBy: null,
    });
  });

  it('is a 404 for an annotation not on this site, or a page with annotations off', async () => {
    annFindFirst.mockResolvedValueOnce(null);
    expect((await POST(postReq({ status: 'resolved' }), params())).status).toBe(
      404,
    );
    siteFind.mockResolvedValue({ ...SITE, configJson: {} });
    expect((await POST(postReq({ status: 'resolved' }), params())).status).toBe(
      404,
    );
    expect(annUpdate).not.toHaveBeenCalled();
  });

  it('rejects non-JSON and invalid status', async () => {
    expect(
      (await POST(postReq('status=resolved', 'text/plain'), params())).status,
    ).toBe(415);
    expect((await POST(postReq({ status: 'deleted' }), params())).status).toBe(
      400,
    );
  });
});
