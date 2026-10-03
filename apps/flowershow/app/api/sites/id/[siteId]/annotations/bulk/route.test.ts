import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/server')>()),
  after: (task: unknown) => (typeof task === 'function' ? task() : task),
}));
vi.mock('@/lib/cli-auth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/cli-auth')>()),
  validateAccessToken: vi.fn(),
}));
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
    annotation: { updateMany: vi.fn(), deleteMany: vi.fn() },
  },
}));

import { validateAccessToken } from '@/lib/cli-auth';
import prisma from '@/server/db';
import { POST } from './route';

const validateToken = validateAccessToken as ReturnType<typeof vi.fn>;
const siteFind = prisma.site.findUnique as ReturnType<typeof vi.fn>;
const updateMany = prisma.annotation.updateMany as ReturnType<typeof vi.fn>;
const deleteMany = prisma.annotation.deleteMany as ReturnType<typeof vi.fn>;

const req = (body: unknown) =>
  new NextRequest('http://localhost/api/sites/id/site-1/annotations/bulk', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      authorization: 'Bearer fs_pat_x',
      'content-type': 'application/json',
    },
  });
const params = () => ({ params: Promise.resolve({ siteId: 'site-1' }) });

beforeEach(() => {
  vi.clearAllMocks();
  validateToken.mockResolvedValue({ userId: 'owner-1' });
  siteFind.mockResolvedValue({ id: 'site-1', userId: 'owner-1' });
  updateMany.mockResolvedValue({ count: 2 });
  deleteMany.mockResolvedValue({ count: 3 });
});

describe('POST /api/sites/id/:siteId/annotations/bulk', () => {
  it('resolves open annotations by id, scoped to the site', async () => {
    expect(
      await (
        await POST(req({ action: 'resolve', ids: ['a1', 'a2'] }), params())
      ).json(),
    ).toEqual({ count: 2 });
    expect(updateMany).toHaveBeenCalledWith({
      where: { siteId: 'site-1', id: { in: ['a1', 'a2'] }, status: 'open' },
      data: { status: 'resolved', resolvedAt: expect.any(Date) },
    });
  });

  it('reopens resolved annotations', async () => {
    await POST(req({ action: 'reopen', all: true }), params());
    expect(updateMany).toHaveBeenCalledWith({
      where: { siteId: 'site-1', status: 'resolved' },
      data: { status: 'open', resolvedAt: null },
    });
  });

  it('deletes all on one page', async () => {
    expect(
      await (
        await POST(
          req({ action: 'delete', all: true, path: '/notes/draft.md' }),
          params(),
        )
      ).json(),
    ).toEqual({ count: 3 });
    expect(deleteMany).toHaveBeenCalledWith({
      where: { siteId: 'site-1', path: 'notes/draft.md' },
    });
  });

  it('requires exactly one of ids or all', async () => {
    expect((await POST(req({ action: 'delete' }), params())).status).toBe(400);
    expect(
      (await POST(req({ action: 'delete', all: true, ids: ['a1'] }), params()))
        .status,
    ).toBe(400);
    expect(deleteMany).not.toHaveBeenCalled();
  });

  it('401s without a token and 403s for another user', async () => {
    validateToken.mockResolvedValueOnce(null);
    expect(
      (await POST(req({ action: 'delete', all: true }), params())).status,
    ).toBe(401);
    validateToken.mockResolvedValueOnce({ userId: 'intruder' });
    expect(
      (await POST(req({ action: 'delete', all: true }), params())).status,
    ).toBe(403);
    expect(deleteMany).not.toHaveBeenCalled();
  });
});
