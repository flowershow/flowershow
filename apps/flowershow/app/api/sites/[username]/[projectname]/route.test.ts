import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mocks must be declared before the imports they affect (vi.mock is hoisted)

vi.mock('@/lib/cli-auth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/cli-auth')>()),
  validateAccessToken: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/server/db', () => ({
  default: {
    site: { findFirst: vi.fn(), findUnique: vi.fn() },
  },
}));

vi.mock('@/lib/anonymous-user', () => ({
  ANONYMOUS_USER_ID: 'anon-user-id',
}));

// Pulls in `server-only`, which throws under the unit test environment.
vi.mock('@/lib/db/internal', () => ({
  internalSiteSelect: {},
}));

import prisma from '@/server/db';
import { GET } from './route';

function makeRequest(username: string, projectname: string): NextRequest {
  return new NextRequest(
    `http://localhost/api/sites/${username}/${projectname}`,
  );
}

function makeParams(username: string, projectname: string) {
  return { params: Promise.resolve({ username, projectname }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  (prisma.site.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
  (prisma.site.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
});

describe('GET /api/sites/:username/:projectname — exact name lookup', () => {
  it('looks up a user site by the RAW projectName, preserving capitals + spaces', async () => {
    await GET(
      makeRequest('olayway', 'My Notes'),
      makeParams('olayway', 'My Notes'),
    );

    expect(prisma.site.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          user: { username: 'olayway' },
          projectName: 'My Notes',
        }),
      }),
    );
  });

  it('looks up an anon site by the RAW projectName', async () => {
    await GET(makeRequest('anon', 'My Notes'), makeParams('anon', 'My Notes'));

    expect(prisma.site.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          projectName: 'My Notes',
          userId: 'anon-user-id',
        }),
      }),
    );
  });

  it('does not slugify — a slug-safe name is matched verbatim', async () => {
    await GET(
      makeRequest('olayway', 'my-notes'),
      makeParams('olayway', 'my-notes'),
    );

    expect(prisma.site.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ projectName: 'my-notes' }),
      }),
    );
  });

  it('does NOT sanitize custom-domain lookups (_domain)', async () => {
    await GET(
      makeRequest('_domain', 'My.Domain.com'),
      makeParams('_domain', 'My.Domain.com'),
    );

    expect(prisma.site.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { customDomain: 'My.Domain.com' },
      }),
    );
    expect(prisma.site.findFirst).not.toHaveBeenCalled();
  });

  it('does NOT sanitize subdomain lookups (_subdomain)', async () => {
    await GET(
      makeRequest('_subdomain', 'my-sub'),
      makeParams('_subdomain', 'my-sub'),
    );

    expect(prisma.site.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { subdomain: 'my-sub' },
      }),
    );
    expect(prisma.site.findFirst).not.toHaveBeenCalled();
  });

  it('returns 404 when no site matches', async () => {
    const res = await GET(
      makeRequest('olayway', 'My Notes'),
      makeParams('olayway', 'My Notes'),
    );
    expect(res.status).toBe(404);
  });
});
