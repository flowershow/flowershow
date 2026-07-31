import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mocks must be declared before the imports they affect (vi.mock is hoisted)

vi.mock('@/server/db', () => ({
  default: { site: { findFirst: vi.fn() } },
}));

vi.mock('@/lib/content-store', () => ({
  fetchFile: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/lib/rss', () => ({
  buildRssFeed: vi.fn().mockReturnValue('<rss/>'),
}));

vi.mock('@/lib/site-config', () => ({
  resolveSiteConfig: vi
    .fn()
    .mockReturnValue({ enableRss: true, title: 't', description: 'd' }),
  resolveSiteName: vi.fn(
    (config, projectName) => config?.siteName ?? config?.title ?? projectName,
  ),
}));

vi.mock('@/lib/get-site-url', () => ({
  getSiteUrl: vi.fn().mockReturnValue('http://site.test'),
}));

import prisma from '@/server/db';
import { GET } from './route';

const findFirst = prisma.site.findFirst as ReturnType<typeof vi.fn>;

function makeReq(): NextRequest {
  return new NextRequest('http://localhost/api/rss/victim/notes');
}

function makeParams() {
  return { params: Promise.resolve({ user: 'victim', project: 'notes' }) };
}

const passwordSite = {
  id: 'site-1',
  privacyMode: 'PASSWORD',
  tokenVersion: 1,
  userId: 'owner-1',
  projectName: 'notes',
  configJson: null,
  blobs: [],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/rss — password gate', () => {
  it('returns 404 for a PASSWORD site with no access cookie', async () => {
    findFirst.mockResolvedValue(passwordSite);

    const res = await GET(makeReq(), makeParams());

    expect(res.status).toBe(404);
  });

  it('serves the feed for a public site without a cookie', async () => {
    findFirst.mockResolvedValue({ ...passwordSite, privacyMode: 'PUBLIC' });

    const res = await GET(makeReq(), makeParams());

    expect(res.status).toBe(200);
    expect(await res.text()).toBe('<rss/>');
  });
});
