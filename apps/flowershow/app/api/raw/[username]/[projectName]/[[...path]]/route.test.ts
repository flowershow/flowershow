import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mocks must be declared before the imports they affect (vi.mock is hoisted)

vi.mock('@/server/db', () => ({
  default: { site: { findFirst: vi.fn() } },
}));

vi.mock('@/lib/content-store', () => ({
  fetchFile: vi.fn().mockResolvedValue(null),
  generatePresignedGetUrl: vi
    .fn()
    .mockResolvedValue('https://s3.example.com/presigned'),
}));

import { generatePresignedGetUrl } from '@/lib/content-store';
import prisma from '@/server/db';
import { GET } from './route';

const findFirst = prisma.site.findFirst as ReturnType<typeof vi.fn>;

function makeReq(path: string): NextRequest {
  return new NextRequest(`http://localhost/api/raw/victim/notes/${path}`);
}

function makeParams(path: string) {
  return {
    params: Promise.resolve({
      username: 'victim',
      projectName: 'notes',
      path: path.split('/'),
    }),
  };
}

const passwordSite = {
  id: 'site-1',
  privacyMode: 'PASSWORD',
  tokenVersion: 1,
  userId: 'owner-1',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/raw — password gate', () => {
  it('blocks a non-image file on a PASSWORD site with no access cookie (401)', async () => {
    findFirst.mockResolvedValue(passwordSite);

    const res = await GET(makeReq('secret.md'), makeParams('secret.md'));

    expect(res.status).toBe(401);
    // Never reaches the presigned-URL step for a blocked request.
    expect(generatePresignedGetUrl).not.toHaveBeenCalled();
  });

  it('exempts images so the server-side image optimizer still works (no 401)', async () => {
    findFirst.mockResolvedValue(passwordSite);

    const res = await GET(makeReq('cover.png'), makeParams('cover.png'));

    expect(res.status).toBe(302);
    expect(generatePresignedGetUrl).toHaveBeenCalled();
  });

  it('serves a public site without a cookie (redirect, not blocked)', async () => {
    findFirst.mockResolvedValue({ ...passwordSite, privacyMode: 'PUBLIC' });

    const res = await GET(makeReq('page.md'), makeParams('page.md'));

    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toContain('s3.test.com');
  });
});
