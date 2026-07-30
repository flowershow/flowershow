import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mocks must be declared before the imports they affect (vi.mock is hoisted)

vi.mock('@/lib/cli-auth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/cli-auth')>()),
  // Anonymous public caller (no token) — the branch that could leak paths.
  validateAccessToken: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/server/db', () => ({
  default: {
    site: { findUnique: vi.fn() },
    publish: { findFirst: vi.fn() },
    publishFile: { findMany: vi.fn() },
  },
}));

vi.mock('@/lib/server-posthog', () => ({
  default: () => ({
    capture: vi.fn(),
    captureException: vi.fn(),
    shutdown: vi.fn().mockResolvedValue(undefined),
  }),
}));

import prisma from '@/server/db';
import { GET } from './route';

const findUnique = prisma.site.findUnique as ReturnType<typeof vi.fn>;
const publishFindFirst = prisma.publish.findFirst as ReturnType<typeof vi.fn>;
const publishFileFindMany = prisma.publishFile.findMany as ReturnType<
  typeof vi.fn
>;

function makeReq(): NextRequest {
  return new NextRequest('http://localhost/api/sites/id/site-1/status');
}

function makeParams() {
  return { params: Promise.resolve({ siteId: 'site-1' }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  publishFindFirst.mockResolvedValue({ id: 'pub-1', legacy: false });
  // A failed publish whose file paths must not leak on a PASSWORD site.
  publishFileFindMany.mockResolvedValue([
    { id: 'f1', path: 'secret/notes.md', status: 'error', error: 'boom' },
  ]);
});

describe('GET /api/sites/id/:siteId/status — anonymous error branch', () => {
  it('hides failing file paths for a PASSWORD site (coarse status only)', async () => {
    findUnique.mockResolvedValue({
      id: 'site-1',
      userId: 'owner-1',
      privacyMode: 'PASSWORD',
    });

    const res = await GET(makeReq(), makeParams());

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ status: 'error' });
    expect(body).not.toHaveProperty('errors');
  });

  it('exposes failing file paths for a public site', async () => {
    findUnique.mockResolvedValue({
      id: 'site-1',
      userId: 'owner-1',
      privacyMode: 'PUBLIC',
    });

    const res = await GET(makeReq(), makeParams());

    const body = await res.json();
    expect(body.status).toBe('error');
    expect(body.errors).toEqual([{ path: 'secret/notes.md', error: 'boom' }]);
  });
});
