import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mocks must be declared before the imports they affect (vi.mock is hoisted)

vi.mock('@/server/db', () => ({
  default: { site: { findFirst: vi.fn() } },
}));

vi.mock('@/lib/get-site-url', () => ({
  getSiteUrl: vi.fn().mockReturnValue('http://site.test'),
}));

import prisma from '@/server/db';
import { GET } from './route';

const findFirst = prisma.site.findFirst as ReturnType<typeof vi.fn>;

function makeReq(): NextRequest {
  return new NextRequest('http://localhost/api/sitemap/victim/notes');
}

function makeParams() {
  return { params: Promise.resolve({ user: 'victim', project: 'notes' }) };
}

const passwordSite = {
  id: 'site-1',
  privacyMode: 'PASSWORD',
  tokenVersion: 1,
  userId: 'owner-1',
  updatedAt: new Date(0),
  blobs: [],
};

beforeEach(() => {
  vi.clearAllMocks();
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
  });
});
