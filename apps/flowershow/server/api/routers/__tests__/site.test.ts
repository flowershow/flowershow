import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── Mocks (must come before imports that depend on them) ──────────

vi.mock('@/env.mjs', () => ({
  env: {
    NEXT_PUBLIC_VERCEL_ENV: 'test',
    NEXT_PUBLIC_ROOT_DOMAIN: 'localhost:3000',
  },
}));

vi.mock('next/cache', () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
  revalidateTag: vi.fn(),
}));

vi.mock('@/server/auth', () => ({
  getSession: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/server/db', () => ({
  db: {},
}));

vi.mock('@/lib/stripe', () => ({ stripe: {} }));
vi.mock('@/inngest/client', () => ({ inngest: { send: vi.fn() } }));
vi.mock('@/lib/server-posthog', () => {
  const client = {
    capture: vi.fn(),
    shutdown: vi.fn().mockResolvedValue(undefined),
  };
  return { default: () => client, __esModule: true };
});
vi.mock('@/lib/domains', () => ({
  addDomainToVercel: vi.fn(),
  getDomainVariant: vi.fn((domain: string) =>
    domain.startsWith('www.') ? domain.slice(4) : `www.${domain}`,
  ),
  removeDomainAndVariantFromVercelProject: vi.fn(),
  validDomainRegex: /./,
}));
vi.mock('@/lib/github', () => ({
  checkIfBranchExists: vi.fn(),
  fetchGitHubRepoTree: vi.fn(),
}));
vi.mock('@/lib/content-store', () => ({
  deleteProject: vi.fn(),
  fetchFile: vi.fn(),
}));

// ── Imports ───────────────────────────────────────────────────────

import { appRouter } from '@/server/api/root';

// ── Helpers ───────────────────────────────────────────────────────

/** Minimal blob factory */
function makeBlob(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'blob-1',
    siteId: 'site-1',
    path: 'README.md',
    appPath: '/',
    permalink: null,
    size: 100,
    sha: 'abc',
    metadata: { title: 'Test', publish: true },
    extension: 'md',
    width: null,
    height: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/** Minimal site (as returned by site.findFirst with include: { user: true }) */
function makeSite(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'site-1',
    projectName: 'my-site',
    ghRepository: 'user/repo',
    ghBranch: 'main',
    customDomain: null,
    rootDir: null,
    plan: 'FREE',
    enableComments: false,
    giscusRepoId: null,
    giscusCategoryId: null,
    enableSearch: false,
    showSidebar: true,
    privacyMode: 'PUBLIC',
    syntaxMode: 'md',
    installationRepositoryId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    userId: 'user-1',
    isTemporary: false,
    expiresAt: null,
    anonymousOwnerId: null,
    user: { id: 'user-1', username: 'testuser' },
    ...overrides,
  };
}

/**
 * Build a mock Prisma-like `db` object driven by a flat list of blobs.
 *
 * Queries are routed by inspecting the `where` argument rather than
 * relying on call order, so tests won't break if the implementation
 * reorders, adds, or removes internal queries.
 */
type MockPublish = { id: string; startedAt: Date };
type MockPublishFile = {
  publishId: string;
  path: string;
  status: 'uploading' | 'success' | 'error';
  error?: string | null;
};

function createMockDb({
  blobs = [] as ReturnType<typeof makeBlob>[],
  site = makeSite(),
  publishes = [] as MockPublish[],
  publishFiles = [] as MockPublishFile[],
}: {
  blobs?: ReturnType<typeof makeBlob>[];
  site?: ReturnType<typeof makeSite> | null;
  publishes?: MockPublish[];
  publishFiles?: MockPublishFile[];
} = {}) {
  return {
    blob: {
      findFirst: vi.fn(async (args: any) => {
        const w = args?.where ?? {};
        return (
          blobs.find((b) => {
            if (w.siteId && b.siteId !== w.siteId) return false;
            if (w.permalink !== undefined && b.permalink !== w.permalink)
              return false;
            if (w.appPath !== undefined && b.appPath !== w.appPath)
              return false;
            if (w.extension?.in && !w.extension.in.includes(b.extension))
              return false;
            return true;
          }) ?? null
        );
      }),
      findMany: vi.fn(async (args: any) => {
        const w = args?.where ?? {};
        const sel = args?.select;
        const matches = blobs.filter((b) => {
          if (w.siteId && b.siteId !== w.siteId) return false;
          if (w.appPath !== undefined && b.appPath !== w.appPath) return false;
          return true;
        });
        // If only `path` is selected, project down (used by siteFilePaths)
        if (sel && Object.keys(sel).length === 1 && sel.path) {
          return matches.map((b) => ({ path: b.path }));
        }
        return matches;
      }),
      aggregate: vi.fn(async () => {
        const dates = blobs.map((b) => b.updatedAt).filter(Boolean);
        return {
          _max: {
            updatedAt:
              dates.length > 0
                ? new Date(Math.max(...dates.map((d) => d.getTime())))
                : null,
          },
        };
      }),
    },
    site: {
      findFirst: vi.fn(async () => site),
      findUnique: vi.fn(async () => site),
    },
    publish: {
      findFirst: vi.fn(async () => {
        const sorted = [...publishes].sort(
          (a, b) => b.startedAt.getTime() - a.startedAt.getTime(),
        );
        return sorted[0] ?? null;
      }),
    },
    publishFile: {
      findMany: vi.fn(async (args: any) => {
        const w = args?.where ?? {};
        return publishFiles.filter(
          (f) => !w.publishId || f.publishId === w.publishId,
        );
      }),
    },
  };
}

function createCaller(mockDb: ReturnType<typeof createMockDb>) {
  return appRouter.createCaller({
    session: null,
    db: mockDb as any,
    headers: new Headers(),
  });
}

function createAuthenticatedCaller(mockDb: ReturnType<typeof createMockDb>) {
  return appRouter.createCaller({
    session: { user: { id: 'user-1' }, expires: '' } as any,
    db: mockDb as any,
    headers: new Headers(),
  });
}

// ── Tests ─────────────────────────────────────────────────────────

describe('site.getBlob', () => {
  describe('index.md vs README.md precedence', () => {
    it('prefers index.md over README.md at the root', async () => {
      const blobs = [
        makeBlob({ id: 'readme-blob', path: 'README.md', appPath: '/' }),
        makeBlob({ id: 'index-blob', path: 'index.md', appPath: '/' }),
      ];
      const db = createMockDb({ blobs });
      const caller = createCaller(db);

      const result = await caller.site.getBlob({
        siteId: 'site-1',
        slug: '/',
      });

      expect(result.id).toBe('index-blob');
      expect(result.path).toBe('index.md');
    });

    it('prefers index.md over README.md in a subdirectory', async () => {
      const blobs = [
        makeBlob({
          id: 'blog-readme',
          path: 'blog/README.md',
          appPath: 'blog',
        }),
        makeBlob({
          id: 'blog-index',
          path: 'blog/index.md',
          appPath: 'blog',
        }),
      ];
      const db = createMockDb({ blobs });
      const caller = createCaller(db);

      const result = await caller.site.getBlob({
        siteId: 'site-1',
        slug: 'blog',
      });

      expect(result.id).toBe('blog-index');
      expect(result.path).toBe('blog/index.md');
    });

    it('prefers index.mdx over README.md', async () => {
      const blobs = [
        makeBlob({ id: 'readme-blob', path: 'README.md', appPath: '/' }),
        makeBlob({
          id: 'index-mdx',
          path: 'index.mdx',
          appPath: '/',
          extension: 'mdx',
        }),
      ];
      const db = createMockDb({ blobs });
      const caller = createCaller(db);

      const result = await caller.site.getBlob({
        siteId: 'site-1',
        slug: '/',
      });

      expect(result.id).toBe('index-mdx');
      expect(result.path).toBe('index.mdx');
    });

    it('returns README.md when no index.md exists', async () => {
      const blobs = [
        makeBlob({ id: 'readme-blob', path: 'README.md', appPath: '/' }),
      ];
      const db = createMockDb({ blobs });
      const caller = createCaller(db);

      const result = await caller.site.getBlob({
        siteId: 'site-1',
        slug: '/',
      });

      expect(result.id).toBe('readme-blob');
      expect(result.path).toBe('README.md');
    });
  });

  describe('permalink lookup', () => {
    it('finds blob by permalink before trying appPath', async () => {
      const blobs = [
        makeBlob({
          id: 'permalink-blob',
          path: 'some/deep/page.md',
          appPath: '/some/deep/page',
          permalink: '/my-page',
        }),
      ];
      const db = createMockDb({ blobs });
      const caller = createCaller(db);

      const result = await caller.site.getBlob({
        siteId: 'site-1',
        slug: '/my-page',
      });

      expect(result.id).toBe('permalink-blob');
    });
  });

  describe('home page fallback', () => {
    it('falls back to first md/mdx blob when slug is / and no appPath match', async () => {
      const blobs = [
        makeBlob({
          id: 'fallback-blob',
          path: 'about.md',
          appPath: 'about',
        }),
      ];
      const db = createMockDb({ blobs });
      const caller = createCaller(db);

      const result = await caller.site.getBlob({
        siteId: 'site-1',
        slug: '/',
      });

      expect(result.id).toBe('fallback-blob');
    });

    it('throws NOT_FOUND when no blobs exist at all', async () => {
      const db = createMockDb({ blobs: [] });
      const caller = createCaller(db);

      await expect(
        caller.site.getBlob({ siteId: 'site-1', slug: '/' }),
      ).rejects.toThrow('Page not found');
    });
  });

  describe('single candidate', () => {
    it('returns the only appPath candidate without filtering', async () => {
      const blobs = [
        makeBlob({ id: 'only-blob', path: 'guide.md', appPath: 'guide' }),
      ];
      const db = createMockDb({ blobs });
      const caller = createCaller(db);

      const result = await caller.site.getBlob({
        siteId: 'site-1',
        slug: 'guide',
      });

      expect(result.id).toBe('only-blob');
    });
  });
});

describe('site.getSyncStatus', () => {
  it('returns UNPUBLISHED when no Publish records exist', async () => {
    const db = createMockDb({ publishes: [], publishFiles: [] });
    const caller = createAuthenticatedCaller(db);

    const result = await caller.site.getSyncStatus({ id: 'site-1' });

    expect(result.status).toBe('UNPUBLISHED');
    expect(result.lastSyncedAt).toBeNull();
  });

  it('returns PENDING when a Publish exists but has no PublishFile rows yet', async () => {
    const startedAt = new Date('2026-05-01T10:00:00Z');
    const db = createMockDb({
      publishes: [{ id: 'pub-1', startedAt }],
      publishFiles: [],
    });
    const caller = createAuthenticatedCaller(db);

    const result = await caller.site.getSyncStatus({ id: 'site-1' });

    expect(result.status).toBe('PENDING');
    expect(result.lastSyncedAt).toEqual(startedAt);
  });

  it('returns PENDING when any PublishFile is in uploading status', async () => {
    const startedAt = new Date('2026-05-01T10:00:00Z');
    const db = createMockDb({
      publishes: [{ id: 'pub-1', startedAt }],
      publishFiles: [
        { publishId: 'pub-1', path: 'index.md', status: 'success' },
        { publishId: 'pub-1', path: 'page.md', status: 'uploading' },
      ],
    });
    const caller = createAuthenticatedCaller(db);

    const result = await caller.site.getSyncStatus({ id: 'site-1' });

    expect(result.status).toBe('PENDING');
  });

  it('returns SUCCESS when all PublishFile rows are terminal with no errors', async () => {
    const startedAt = new Date('2026-05-01T10:00:00Z');
    const db = createMockDb({
      publishes: [{ id: 'pub-1', startedAt }],
      publishFiles: [
        { publishId: 'pub-1', path: 'index.md', status: 'success' },
        { publishId: 'pub-1', path: 'page.md', status: 'success' },
      ],
    });
    const caller = createAuthenticatedCaller(db);

    const result = await caller.site.getSyncStatus({ id: 'site-1' });

    expect(result.status).toBe('SUCCESS');
    expect(result.lastSyncedAt).toEqual(startedAt);
  });

  it('returns ERROR when all PublishFile rows are terminal and at least one errored', async () => {
    const startedAt = new Date('2026-05-01T10:00:00Z');
    const db = createMockDb({
      publishes: [{ id: 'pub-1', startedAt }],
      publishFiles: [
        { publishId: 'pub-1', path: 'index.md', status: 'success' },
        {
          publishId: 'pub-1',
          path: 'page.md',
          status: 'error',
          error: 'parse failed',
        },
      ],
    });
    const caller = createAuthenticatedCaller(db);

    const result = await caller.site.getSyncStatus({ id: 'site-1' });

    expect(result.status).toBe('ERROR');
    expect(result.error).toContain('[page.md]: parse failed');
  });
});
