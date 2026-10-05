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

import prisma from '@/server/db';
import { GET } from './route';

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
