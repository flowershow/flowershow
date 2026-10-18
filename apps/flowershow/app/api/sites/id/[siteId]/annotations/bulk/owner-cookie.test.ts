// @vitest-environment node
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Owner actions with the site-scoped owner cookie (flowershow-1pr.15).

vi.mock('next/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/server')>()),
  after: (task: unknown) => (typeof task === 'function' ? task() : task),
}));
vi.mock('@/lib/cli-auth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/cli-auth')>()),
  validateAccessToken: vi.fn().mockResolvedValue(null),
}));
vi.mock('@/lib/server-posthog', () => {
  const client = { capture: vi.fn(), shutdown: vi.fn() };
  return { default: () => client, __esModule: true };
});
vi.mock('@/server/db', () => ({
  default: {
    site: { findUnique: vi.fn() },
    annotation: { updateMany: vi.fn(), deleteMany: vi.fn() },
  },
}));

import { ownerCookieName, signOwnerToken } from '@/lib/site-owner-session';
import prisma from '@/server/db';
import { POST } from './route';

const siteFind = prisma.site.findUnique as ReturnType<typeof vi.fn>;
const updateMany = prisma.annotation.updateMany as ReturnType<typeof vi.fn>;
const deleteMany = prisma.annotation.deleteMany as ReturnType<typeof vi.fn>;

const HOST = 'notes-alice.test.localhost';
const params = () => ({ params: Promise.resolve({ siteId: 'site-1' }) });

async function cookie(
  opts: { userId?: string; siteId?: string; host?: string } = {},
) {
  const token = await signOwnerToken({
    siteId: opts.siteId ?? 'site-1',
    userId: opts.userId ?? 'owner-1',
    host: opts.host ?? HOST,
  });
  return `${ownerCookieName()}=${token}`;
}

function req(
  body: unknown,
  headers: Record<string, string>,
  host = HOST,
): NextRequest {
  return new NextRequest(
    `http://${host}/api/sites/id/site-1/annotations/bulk`,
    {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { host, 'content-type': 'application/json', ...headers },
    },
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  siteFind.mockResolvedValue({ id: 'site-1', userId: 'owner-1' });
  updateMany.mockResolvedValue({ count: 1 });
  deleteMany.mockResolvedValue({ count: 1 });
});

describe('POST annotations/bulk with the owner cookie', () => {
  it('lets the owner resolve a comment from the site page', async () => {
    const res = await POST(
      req(
        { action: 'resolve', ids: ['a1'] },
        { cookie: await cookie(), origin: `https://${HOST}` },
      ),
      params(),
    );
    expect(res.status).toBe(200);
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          siteId: 'site-1',
          id: { in: ['a1'] },
        }),
      }),
    );
  });

  it('lets the owner delete a comment', async () => {
    const res = await POST(
      req(
        { action: 'delete', ids: ['a1'] },
        { cookie: await cookie(), origin: `https://${HOST}` },
      ),
      params(),
    );
    expect(res.status).toBe(200);
    expect(deleteMany).toHaveBeenCalled();
  });

  it('refuses a cross-origin request (sibling site carrying the cookie)', async () => {
    const res = await POST(
      req(
        { action: 'delete', all: true },
        {
          cookie: await cookie(),
          origin: 'https://evil-bob.test.localhost',
        },
      ),
      params(),
    );
    expect(res.status).toBe(403);
    expect(deleteMany).not.toHaveBeenCalled();
  });

  it('refuses a request with no Origin', async () => {
    const res = await POST(
      req({ action: 'delete', all: true }, { cookie: await cookie() }),
      params(),
    );
    expect(res.status).toBe(403);
    expect(deleteMany).not.toHaveBeenCalled();
  });

  it('refuses a cookie for another site', async () => {
    const res = await POST(
      req(
        { action: 'delete', all: true },
        {
          cookie: await cookie({ siteId: 'site-2' }),
          origin: `https://${HOST}`,
        },
      ),
      params(),
    );
    expect(res.status).toBe(401);
    expect(deleteMany).not.toHaveBeenCalled();
  });

  it('refuses a cookie minted on another host', async () => {
    const res = await POST(
      req(
        { action: 'delete', all: true },
        {
          cookie: await cookie({ host: 'other.test.localhost' }),
          origin: `https://${HOST}`,
        },
      ),
      params(),
    );
    expect(res.status).toBe(401);
  });

  it('refuses a cookie for a user who does not own the site (non-owner)', async () => {
    const res = await POST(
      req(
        { action: 'delete', all: true },
        {
          cookie: await cookie({ userId: 'mallory' }),
          origin: `https://${HOST}`,
        },
      ),
      params(),
    );
    expect(res.status).toBe(401);
    expect(deleteMany).not.toHaveBeenCalled();
  });

  it('refuses a forged cookie', async () => {
    const res = await POST(
      req(
        { action: 'delete', all: true },
        {
          cookie: `${ownerCookieName()}=eyJhbGciOiJub25lIn0.eyJzdWIiOiJvd25lci0xIn0.`,
          origin: `https://${HOST}`,
        },
      ),
      params(),
    );
    expect(res.status).toBe(401);
    expect(deleteMany).not.toHaveBeenCalled();
  });
});
