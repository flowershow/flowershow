import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/env.mjs', () => ({
  env: { NEXT_PUBLIC_HOME_DOMAIN: 'flowershow.app' },
}));
vi.mock('@/lib/cli-auth', () => ({
  checkCliVersion: vi.fn(() => null),
  getClientInfo: vi.fn(() => ({ client_type: 'cli', client_version: '1' })),
  validateAccessToken: vi.fn(),
}));
vi.mock('@/lib/site-create-limit', async (orig) => ({
  ...(await orig<typeof import('@/lib/site-create-limit')>()),
  siteCreateAllowed: vi.fn(),
}));
vi.mock('@/lib/email', () => ({ sendEmail: vi.fn() }));
vi.mock('@/lib/server-posthog', () => ({
  default: () => ({
    capture: vi.fn(),
    captureException: vi.fn(),
    shutdown: vi.fn(),
  }),
}));
vi.mock('@/lib/typesense', () => ({
  createSiteCollection: vi.fn(),
  deleteSiteCollection: vi.fn(),
}));
vi.mock('@/server/db', () => ({
  default: {
    site: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    user: { findUnique: vi.fn() },
    blob: { deleteMany: vi.fn() },
  },
}));

import { validateAccessToken } from '@/lib/cli-auth';
import { siteCreateAllowed } from '@/lib/site-create-limit';
import prisma from '@/server/db';
import { ListSitesResponseSchema } from '@flowershow/api-contract';
import { GET, POST } from './route';

const allowed = siteCreateAllowed as ReturnType<typeof vi.fn>;
const findFirst = prisma.site.findFirst as ReturnType<typeof vi.fn>;
const create = prisma.site.create as ReturnType<typeof vi.fn>;
const update = prisma.site.update as ReturnType<typeof vi.fn>;

const row = {
  id: 's1',
  projectName: 'docs',
  subdomain: 'docs',
  customDomain: null,
  userId: 'u1',
  createdAt: new Date(),
};

function req(body: unknown) {
  return new NextRequest('http://localhost/api/sites', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  (validateAccessToken as ReturnType<typeof vi.fn>).mockResolvedValue({
    userId: 'u1',
  });
  (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
    username: 'rufus',
    email: null,
    name: 'R',
  });
  findFirst.mockResolvedValue(null);
  create.mockResolvedValue(row);
  update.mockResolvedValue(row);
  allowed.mockResolvedValue(true);
});

describe('POST /api/sites rate limit', () => {
  it('creates and counts a hit for a new site', async () => {
    const res = await POST(req({ projectName: 'docs' }));
    expect(res.status).toBe(201);
    expect(allowed).toHaveBeenCalledWith('u1');
    expect(create).toHaveBeenCalled();
  });

  it('returns 429 rate_limited with the message and does not create', async () => {
    allowed.mockResolvedValue(false);
    const res = await POST(req({ projectName: 'docs' }));
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({
      error: 'rate_limited',
      message:
        "You've created 20 sites in the last hour. Try again later, or get in touch if you need more.",
    });
    expect(create).not.toHaveBeenCalled();
  });

  it('does not count a name conflict (409)', async () => {
    findFirst.mockResolvedValue(row);
    const res = await POST(req({ projectName: 'docs' }));
    expect(res.status).toBe(409);
    expect(allowed).not.toHaveBeenCalled();
  });

  it('does not count a validation failure (400)', async () => {
    const res = await POST(req({}));
    expect(res.status).toBe(400);
    expect(allowed).not.toHaveBeenCalled();
  });

  it('does not count overwrite=true', async () => {
    findFirst.mockResolvedValue(row);
    allowed.mockResolvedValue(false);
    const res = await POST(req({ projectName: 'docs', overwrite: true }));
    expect(res.status).toBe(200);
    expect(allowed).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });
});

describe('GET /api/sites', () => {
  it('lists owned sites and sites the caller can edit, with role and owner', async () => {
    const d = new Date(0);
    (validateAccessToken as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: 'ada-1',
    });
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      username: 'ada',
    });
    (prisma.site.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: 's1',
        projectName: 'mine',
        subdomain: 'mine-ada',
        customDomain: null,
        createdAt: d,
        updatedAt: d,
        _count: { blobs: 1 },
        userId: 'ada-1',
        plan: 'FREE',
        members: [],
        user: { username: 'ada' },
      },
      {
        id: 's2',
        projectName: 'notes',
        subdomain: 'notes-bob',
        customDomain: null,
        createdAt: d,
        updatedAt: d,
        _count: { blobs: 2 },
        userId: 'bob-1',
        plan: 'PREMIUM',
        members: [{ userId: 'ada-1' }],
        user: { username: 'bob' },
      },
    ]);
    const res = await GET(
      new NextRequest('http://localhost/api/sites', { method: 'GET' }),
    );
    const json = await res.json();
    expect(prisma.site.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { userId: 'ada-1' },
            { members: { some: { userId: 'ada-1' } }, plan: 'PREMIUM' },
          ],
        },
      }),
    );
    expect(
      json.sites.map((s: any) => [s.projectName, s.role, s.owner.username]),
    ).toEqual([
      ['mine', 'owner', 'ada'],
      ['notes', 'editor', 'bob'],
    ]);
    expect(ListSitesResponseSchema.safeParse(json).success).toBe(true);
  });
});
