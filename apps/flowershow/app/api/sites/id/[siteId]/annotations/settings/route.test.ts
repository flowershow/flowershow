import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/cache', () => ({
  unstable_cache: (fn: () => unknown) => fn,
  revalidateTag: vi.fn(),
}));
vi.mock('@/lib/cli-auth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/cli-auth')>()),
  validateAccessToken: vi.fn(),
}));
vi.mock('@/lib/content-store', () => ({ fetchFile: vi.fn() }));
vi.mock('@/server/db', () => ({
  default: {
    site: { findUnique: vi.fn(), update: vi.fn() },
    annotation: { count: vi.fn() },
  },
}));

import { revalidateTag } from 'next/cache';
import { validateAccessToken } from '@/lib/cli-auth';
import { fetchFile } from '@/lib/content-store';
import prisma from '@/server/db';
import { GET, PATCH } from './route';

const validateToken = validateAccessToken as ReturnType<typeof vi.fn>;
const siteFind = prisma.site.findUnique as ReturnType<typeof vi.fn>;
const siteUpdate = prisma.site.update as ReturnType<typeof vi.fn>;
const annCount = prisma.annotation.count as ReturnType<typeof vi.fn>;
const fetchFileMock = fetchFile as ReturnType<typeof vi.fn>;

const SITE = {
  id: 'site-1',
  userId: 'owner-1',
  configJson: { showComments: false },
  isTemporary: false,
  anonymousOwnerId: null,
};
const params = () => ({ params: Promise.resolve({ siteId: 'site-1' }) });
const req = (method: string, body?: unknown) =>
  new NextRequest('http://localhost/api/sites/id/site-1/annotations/settings', {
    method,
    headers: {
      authorization: 'Bearer fs_pat_x',
      'content-type': 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

beforeEach(() => {
  vi.clearAllMocks();
  validateToken.mockResolvedValue({ userId: 'owner-1' });
  siteFind.mockResolvedValue(SITE);
  annCount.mockResolvedValue(3);
  fetchFileMock.mockResolvedValue(null);
});

describe('annotation settings', () => {
  it('GET reports the resolved setting and the open count', async () => {
    fetchFileMock.mockResolvedValue('{"annotations": true}');
    expect(await (await GET(req('GET'), params())).json()).toEqual({
      annotationsEnabled: true,
      openAnnotations: 3,
    });
    expect(annCount).toHaveBeenCalledWith({
      where: { siteId: 'site-1', status: 'open' },
    });
  });

  it('PATCH turns annotations on and off in the dashboard config, keeping other keys', async () => {
    const res = await PATCH(req('PATCH', { annotations: true }), params());
    expect(siteUpdate).toHaveBeenCalledWith({
      where: { id: 'site-1' },
      data: { configJson: { showComments: false, annotations: true } },
    });
    expect(revalidateTag).toHaveBeenCalledWith('site-1-config');
    expect(await res.json()).toEqual({
      annotationsEnabled: true,
      openAnnotations: 3,
    });
    await PATCH(req('PATCH', { annotations: false }), params());
    expect(siteUpdate).toHaveBeenLastCalledWith({
      where: { id: 'site-1' },
      data: { configJson: { showComments: false, annotations: false } },
    });
  });

  it('PATCH refuses unclaimed anonymous sites, other users and bad bodies', async () => {
    siteFind.mockResolvedValueOnce({
      ...SITE,
      isTemporary: true,
      anonymousOwnerId: 'anon-1',
    });
    expect(
      (await PATCH(req('PATCH', { annotations: true }), params())).status,
    ).toBe(400);
    validateToken.mockResolvedValueOnce({ userId: 'intruder' });
    expect(
      (await PATCH(req('PATCH', { annotations: true }), params())).status,
    ).toBe(403);
    expect(
      (await PATCH(req('PATCH', { annotations: 'yes' }), params())).status,
    ).toBe(400);
    expect(siteUpdate).not.toHaveBeenCalled();
  });
});
