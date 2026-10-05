import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/cache', () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
  revalidateTag: vi.fn(),
}));
vi.mock('@/server/auth', () => ({
  getSession: vi.fn().mockResolvedValue(null),
}));
vi.mock('@/server/db', () => ({ db: {} }));
vi.mock('@/lib/stripe', () => ({ stripe: {} }));
vi.mock('@/lib/typesense', () => ({ deleteSiteCollection: vi.fn() }));
vi.mock('@/lib/server-posthog', () => {
  const client = {
    capture: vi.fn(),
    captureException: vi.fn(),
    shutdown: vi.fn().mockResolvedValue(undefined),
  };
  return { default: () => client, __esModule: true };
});
vi.mock('@/lib/domains', () => ({
  addDomainToVercel: vi.fn(),
  removeDomainAndVariantFromVercelProject: vi.fn(),
  validDomainRegex: /./,
}));
vi.mock('@/lib/github', () => ({
  fetchGitHubScopes: vi.fn(),
  fetchGitHubScopeRepositories: vi.fn(),
}));
vi.mock('@/lib/transactional-email', () => ({
  sendTransactionalEmail: vi.fn(),
}));

import { appRouter } from '@/server/api/root';

const ROW = {
  id: 'ann-1',
  siteId: 'site-1',
  path: 'notes/draft.md',
  exact: 'brown fox',
  prefix: '',
  suffix: '',
  startOffset: 10,
  endOffset: 19,
  blobSha: 'sha-a',
  status: 'open',
  resolvedAt: null,
  note: 'Make it red',
  authorName: null,
  createdAt: new Date('2026-10-03T10:00:00.000Z'),
};

function makeDb(owner = 'user-1') {
  return {
    site: {
      findUnique: vi.fn().mockResolvedValue({
        userId: owner,
        projectName: 'notes',
        customDomain: null,
        subdomain: 'notes-ada',
        user: { username: 'ada' },
      }),
    },
    blob: {
      findMany: vi
        .fn()
        .mockResolvedValue([
          { path: 'notes/draft.md', sha: 'sha-a', appPath: '/notes/draft' },
        ]),
    },
    annotation: {
      findMany: vi.fn().mockResolvedValue([ROW]),
      findUnique: vi.fn().mockResolvedValue({
        id: 'ann-1',
        siteId: 'site-1',
        site: { userId: owner },
      }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      delete: vi.fn().mockResolvedValue(ROW),
      deleteMany: vi.fn().mockResolvedValue({ count: 4 }),
    },
  };
}

const caller = (db: unknown) =>
  appRouter.createCaller({
    session: { user: { id: 'user-1' }, expires: '' } as any,
    db: db as any,
    headers: new Headers(),
  });

beforeEach(() => vi.clearAllMocks());

describe('annotation router', () => {
  it("lists a site owner's annotations as DTOs, open first", async () => {
    const db = makeDb();
    const result = await caller(db).annotation.listForSite({
      siteId: 'site-1',
    });
    expect(result[0]).toMatchObject({
      id: 'ann-1',
      status: 'open',
      pageEdited: false,
      createdAt: '2026-10-03T10:00:00.000Z',
    });
    expect(result[0]?.pageUrl).toMatch(/\/notes\/draft$/);
    expect(db.annotation.findMany).toHaveBeenCalledWith({
      where: { siteId: 'site-1' },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });
  });

  it('resolves and reopens one note through the shared bulk logic', async () => {
    const db = makeDb();
    await caller(db).annotation.setStatus({ id: 'ann-1', status: 'resolved' });
    expect(db.annotation.updateMany).toHaveBeenCalledWith({
      where: { siteId: 'site-1', id: { in: ['ann-1'] }, status: 'open' },
      data: { status: 'resolved', resolvedAt: expect.any(Date) },
    });
    await caller(db).annotation.setStatus({ id: 'ann-1', status: 'open' });
    expect(db.annotation.updateMany).toHaveBeenLastCalledWith({
      where: { siteId: 'site-1', id: { in: ['ann-1'] }, status: 'resolved' },
      data: { status: 'open', resolvedAt: null },
    });
  });

  it("refuses everything on someone else's site", async () => {
    const db = makeDb('other-user');
    await expect(
      caller(db).annotation.listForSite({ siteId: 'site-1' }),
    ).rejects.toThrow('Site not found');
    await expect(
      caller(db).annotation.setStatus({ id: 'ann-1', status: 'resolved' }),
    ).rejects.toThrow('Annotation not found');
    await expect(caller(db).annotation.delete({ id: 'ann-1' })).rejects.toThrow(
      'Annotation not found',
    );
    await expect(
      caller(db).annotation.deleteAll({ siteId: 'site-1' }),
    ).rejects.toThrow('Site not found');
    expect(db.annotation.updateMany).not.toHaveBeenCalled();
    expect(db.annotation.delete).not.toHaveBeenCalled();
    expect(db.annotation.deleteMany).not.toHaveBeenCalled();
  });

  it('deletes one, and all, for the owner', async () => {
    const db = makeDb();
    expect(await caller(db).annotation.delete({ id: 'ann-1' })).toEqual({
      success: true,
    });
    expect(await caller(db).annotation.deleteAll({ siteId: 'site-1' })).toEqual(
      {
        count: 4,
      },
    );
    expect(db.annotation.deleteMany).toHaveBeenCalledWith({
      where: { siteId: 'site-1' },
    });
  });
});
