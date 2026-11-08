import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/cache', () => ({
  unstable_cache: (fn: () => unknown) => fn,
  revalidateTag: vi.fn(),
}));
vi.mock('@/lib/cli-auth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/cli-auth')>()),
  validateAccessToken: vi.fn().mockResolvedValue({ userId: 'owner-1' }),
}));
vi.mock('@/lib/content-store', () => ({
  fetchFile: vi.fn().mockResolvedValue('{"annotations": true}'),
  deleteProject: vi.fn(),
}));
vi.mock('@/lib/typesense', () => ({ deleteSiteCollection: vi.fn() }));
vi.mock('@/lib/domains', () => ({
  removeDomainAndVariantFromVercelProject: vi.fn(),
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
    annotation: { count: vi.fn().mockResolvedValue(3) },
  },
}));

import { validateAccessToken } from '@/lib/cli-auth';
import prisma from '@/server/db';
import { DELETE, GET } from './route';
import { deleteProject } from '@/lib/content-store';

beforeEach(() => {
  (prisma.site.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
    id: 'site-1',
    projectName: 'notes',
    ghRepository: null,
    ghBranch: null,
    customDomain: null,
    subdomain: 'notes-ada',
    rootDir: null,
    plan: 'FREE',
    privacyMode: 'PUBLIC',
    configJson: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    userId: 'owner-1',
    members: [],
    user: { username: 'ada' },
    _count: { blobs: 1 },
    blobs: [{ size: 10 }],
  });
});

describe('GET /api/sites/id/:siteId annotation fields', () => {
  it('reports the resolved setting and the open count', async () => {
    const res = await GET(
      new NextRequest('http://localhost/api/sites/id/site-1', {
        headers: { authorization: 'Bearer fs_pat_x' },
      }),
      { params: Promise.resolve({ siteId: 'site-1' }) },
    );
    const body = await res.json();
    expect(body.site.annotationsEnabled).toBe(true);
    expect(body.site.openAnnotations).toBe(3);
  });
});

describe('GET /api/sites/id/:siteId editor access', () => {
  const call = () =>
    GET(
      new NextRequest('http://localhost/api/sites/id/site-1', {
        headers: { authorization: 'Bearer fs_pat_x' },
      }),
      { params: Promise.resolve({ siteId: 'site-1' }) },
    );
  const withSite = (plan: string, members: { userId: string }[]) => {
    (prisma.site.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'site-1',
      projectName: 'notes',
      ghRepository: null,
      ghBranch: null,
      customDomain: null,
      subdomain: 'notes-ada',
      rootDir: null,
      plan,
      privacyMode: 'PUBLIC',
      configJson: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: 'owner-1',
      members,
      user: { username: 'ada' },
      _count: { blobs: 1 },
      blobs: [{ size: 10 }],
    });
  };

  it('lets an editor of a Premium site read it', async () => {
    vi.mocked(validateAccessToken).mockResolvedValueOnce({ userId: 'ed-1' });
    withSite('PREMIUM', [{ userId: 'ed-1' }]);
    expect((await call()).status).toBe(200);
  });

  it('refuses an editor of a FREE site with premium_required', async () => {
    vi.mocked(validateAccessToken).mockResolvedValueOnce({ userId: 'ed-1' });
    withSite('FREE', [{ userId: 'ed-1' }]);
    const res = await call();
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe('premium_required');
  });

  it('refuses a removed editor with forbidden', async () => {
    vi.mocked(validateAccessToken).mockResolvedValueOnce({ userId: 'ed-1' });
    withSite('PREMIUM', []);
    const res = await call();
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe('forbidden');
  });
});

describe('DELETE /api/sites/id/:siteId', () => {
  it('refuses an editor of a Premium site', async () => {
    vi.mocked(validateAccessToken).mockResolvedValueOnce({ userId: 'ed-1' });
    (prisma.site.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'site-1',
      userId: 'owner-1',
      customDomain: null,
      plan: 'PREMIUM',
      members: [{ userId: 'ed-1' }],
      _count: { blobs: 0 },
    });
    const res = await DELETE(
      new NextRequest('http://localhost/api/sites/id/site-1', {
        method: 'DELETE',
        headers: { authorization: 'Bearer fs_pat_x' },
      }),
      { params: Promise.resolve({ siteId: 'site-1' }) },
    );
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe('forbidden');
    expect(deleteProject).not.toHaveBeenCalled();
  });
});
