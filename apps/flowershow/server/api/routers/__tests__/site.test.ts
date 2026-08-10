import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── Mocks (must come before imports that depend on them) ──────────

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
vi.mock('@/lib/typesense', () => ({ deleteSiteCollection: vi.fn() }));
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
    subdomain: 'my-site',
    ghRepository: 'user/repo',
    ghBranch: 'main',
    customDomain: null,
    rootDir: null,
    plan: 'FREE',
    enableComments: false,
    giscusRepoId: null,
    giscusCategoryId: null,
    enableSearch: false,
    enableRss: false,
    showSidebar: true,
    showBuiltWithButton: true,
    showRawLink: false,
    privacyMode: 'PUBLIC',
    syntaxMode: 'md',
    tokenVersion: 1,
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
type MockPublish = {
  id: string;
  startedAt: Date;
  completedAt?: Date | null;
  legacy?: boolean;
};
type MockPublishFile = {
  publishId: string;
  path: string;
  status: 'uploading' | 'success' | 'error' | 'canceled' | 'expired';
  error?: string | null;
};
type MockLink = {
  siteId: string;
  sourceBlobId: string;
  targetBlobId: string | null;
};

/** Minimal link factory */
function makeLink(overrides: Partial<MockLink> = {}): MockLink {
  return {
    siteId: 'site-1',
    sourceBlobId: 'blob-1',
    targetBlobId: 'blob-2',
    ...overrides,
  };
}

function createMockDb({
  blobs = [] as ReturnType<typeof makeBlob>[],
  site = makeSite(),
  publishes = [] as MockPublish[],
  publishFiles = [] as MockPublishFile[],
  links = [] as MockLink[],
}: {
  blobs?: ReturnType<typeof makeBlob>[];
  site?: ReturnType<typeof makeSite> | null;
  publishes?: MockPublish[];
  publishFiles?: MockPublishFile[];
  links?: MockLink[];
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
          if (w.id?.in && !(w.id.in as string[]).includes(b.id)) return false;
          if (w.appPath !== undefined) {
            const ap = w.appPath;
            if (ap !== null && typeof ap === 'object' && 'not' in ap) {
              if (ap.not === null && b.appPath === null) return false;
            } else if (b.appPath !== ap) {
              return false;
            }
          }
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
      findMany: vi.fn(async () => (site ? [site] : [])),
    },
    publish: {
      findFirst: vi.fn(async () => {
        const sorted = [...publishes].sort(
          (a, b) => b.startedAt.getTime() - a.startedAt.getTime(),
        );
        const p = sorted[0];
        if (!p) return null;
        const errorFiles = publishFiles.filter(
          (f) => f.publishId === p.id && f.status === 'error',
        );
        return {
          ...p,
          completedAt: p.completedAt ?? null,
          legacy: p.legacy ?? false,
          files: errorFiles.slice(0, 1).map(() => ({ id: 'error-file' })),
        };
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
    link: {
      findMany: vi.fn(async (args: any) => {
        const w = args?.where ?? {};

        let results = links.filter((l) => {
          if (w.siteId && l.siteId !== w.siteId) return false;
          if (w.targetBlobId?.not === null && l.targetBlobId === null)
            return false;
          return true;
        });

        // OR: [{ sourceBlobId: X }, { targetBlobId: X }]  (direct-links query)
        if (w.OR) {
          results = results.filter((l) =>
            (w.OR as any[]).some((cond) => {
              if (
                'sourceBlobId' in cond &&
                l.sourceBlobId !== cond.sourceBlobId
              )
                return false;
              if (
                'targetBlobId' in cond &&
                l.targetBlobId !== cond.targetBlobId
              )
                return false;
              return true;
            }),
          );
        }

        // sourceBlobId: { in: [...] }  (inter-links query)
        if (w.sourceBlobId?.in) {
          results = results.filter((l) =>
            (w.sourceBlobId.in as string[]).includes(l.sourceBlobId),
          );
        }

        // AND: [{ targetBlobId: { in: [...] } }]  (inter-links query)
        if (w.AND) {
          for (const cond of w.AND as any[]) {
            if (cond.targetBlobId?.in) {
              results = results.filter((l) =>
                (cond.targetBlobId.in as string[]).includes(
                  l.targetBlobId as string,
                ),
              );
            }
          }
        }

        // Emulate distinct: ['sourceBlobId', 'targetBlobId']
        const seen = new Set<string>();
        return results.filter((l) => {
          const key = `${l.sourceBlobId}|${l.targetBlobId}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
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

describe('site.getLatestPublishState', () => {
  it('returns isUnpublished when no Publish records exist, regardless of site age', async () => {
    const db = createMockDb({
      publishes: [],
      publishFiles: [],
      // Brand-new site (just created) with no Publish records and no blobs
      site: makeSite({ createdAt: new Date() }),
    });
    const caller = createAuthenticatedCaller(db);

    const result = await caller.site.getLatestPublishState({ id: 'site-1' });

    expect(result.isUnpublished).toBe(true);
    expect(result.isInProgress).toBe(false);
    expect(result.lastPublishedAt).toBeNull();
  });

  it('returns isInProgress when completedAt is null', async () => {
    const startedAt = new Date('2026-05-01T10:00:00Z');
    const db = createMockDb({
      publishes: [{ id: 'pub-1', startedAt, completedAt: null }],
      publishFiles: [],
    });
    const caller = createAuthenticatedCaller(db);

    const result = await caller.site.getLatestPublishState({ id: 'site-1' });

    expect(result.isInProgress).toBe(true);
    expect(result.isUnpublished).toBe(false);
    expect(result.lastPublishedAt).toEqual(startedAt);
  });

  it('returns complete when completedAt is set', async () => {
    const startedAt = new Date('2026-05-01T10:00:00Z');
    const completedAt = new Date('2026-05-01T10:01:00Z');
    const db = createMockDb({
      publishes: [{ id: 'pub-1', startedAt, completedAt }],
      publishFiles: [
        { publishId: 'pub-1', path: 'index.md', status: 'success' },
        { publishId: 'pub-1', path: 'page.md', status: 'success' },
      ],
    });
    const caller = createAuthenticatedCaller(db);

    const result = await caller.site.getLatestPublishState({ id: 'site-1' });

    expect(result.isInProgress).toBe(false);
    expect(result.isUnpublished).toBe(false);
    expect(result.lastPublishedAt).toEqual(completedAt);
  });
});

describe('site.getGraphData', () => {
  it('includes the focal blob as a node', async () => {
    const blobs = [makeBlob({ id: 'focal', appPath: '/focal' })];
    const db = createMockDb({ blobs, links: [] });
    const caller = createCaller(db);

    const result = await caller.site.getGraphData({
      siteId: 'site-1',
      blobId: 'focal',
    });

    expect(result.nodes.map((n) => n.id)).toContain('focal');
  });

  it('includes directly linked blobs as nodes', async () => {
    const blobs = [
      makeBlob({ id: 'focal', appPath: '/focal' }),
      makeBlob({ id: 'neighbor', appPath: '/neighbor' }),
    ];
    const links = [
      makeLink({ sourceBlobId: 'focal', targetBlobId: 'neighbor' }),
    ];
    const db = createMockDb({ blobs, links });
    const caller = createCaller(db);

    const result = await caller.site.getGraphData({
      siteId: 'site-1',
      blobId: 'focal',
    });

    const nodeIds = result.nodes.map((n) => n.id);
    expect(nodeIds).toContain('focal');
    expect(nodeIds).toContain('neighbor');
  });

  it('returns direct links between the focal blob and its neighbors', async () => {
    const blobs = [
      makeBlob({ id: 'focal', appPath: '/focal' }),
      makeBlob({ id: 'neighbor', appPath: '/neighbor' }),
    ];
    const links = [
      makeLink({ sourceBlobId: 'focal', targetBlobId: 'neighbor' }),
    ];
    const db = createMockDb({ blobs, links });
    const caller = createCaller(db);

    const result = await caller.site.getGraphData({
      siteId: 'site-1',
      blobId: 'focal',
    });

    expect(result.links).toContainEqual({
      source: 'focal',
      target: 'neighbor',
    });
  });

  it('returns inter-links between neighbor blobs', async () => {
    const blobs = [
      makeBlob({ id: 'focal', appPath: '/focal' }),
      makeBlob({ id: 'a', appPath: '/a' }),
      makeBlob({ id: 'b', appPath: '/b' }),
    ];
    const links = [
      makeLink({ sourceBlobId: 'focal', targetBlobId: 'a' }),
      makeLink({ sourceBlobId: 'focal', targetBlobId: 'b' }),
      makeLink({ sourceBlobId: 'a', targetBlobId: 'b' }),
    ];
    const db = createMockDb({ blobs, links });
    const caller = createCaller(db);

    const result = await caller.site.getGraphData({
      siteId: 'site-1',
      blobId: 'focal',
    });

    expect(result.links).toContainEqual({ source: 'a', target: 'b' });
  });

  it('excludes blobs with no appPath from nodes', async () => {
    const blobs = [
      makeBlob({ id: 'focal', appPath: '/focal' }),
      makeBlob({ id: 'no-path', appPath: null }),
    ];
    const links = [
      makeLink({ sourceBlobId: 'focal', targetBlobId: 'no-path' }),
    ];
    const db = createMockDb({ blobs, links });
    const caller = createCaller(db);

    const result = await caller.site.getGraphData({
      siteId: 'site-1',
      blobId: 'focal',
    });

    expect(result.nodes.map((n) => n.id)).not.toContain('no-path');
  });

  it('excludes links whose source or target has no appPath', async () => {
    const blobs = [
      makeBlob({ id: 'focal', appPath: '/focal' }),
      makeBlob({ id: 'a', appPath: '/a' }),
      makeBlob({ id: 'no-path', appPath: null }),
    ];
    const links = [
      makeLink({ sourceBlobId: 'focal', targetBlobId: 'a' }),
      makeLink({ sourceBlobId: 'focal', targetBlobId: 'no-path' }),
      makeLink({ sourceBlobId: 'a', targetBlobId: 'no-path' }),
    ];
    const db = createMockDb({ blobs, links });
    const caller = createCaller(db);

    const result = await caller.site.getGraphData({
      siteId: 'site-1',
      blobId: 'focal',
    });

    const linkEndpoints = result.links.flatMap((l) => [l.source, l.target]);
    expect(linkEndpoints).not.toContain('no-path');
  });

  it('does not return duplicate links', async () => {
    const blobs = [
      makeBlob({ id: 'focal', appPath: '/focal' }),
      makeBlob({ id: 'neighbor', appPath: '/neighbor' }),
    ];
    // focal→neighbor is a direct link and also an inter-link (both are neighbors)
    const links = [
      makeLink({ sourceBlobId: 'focal', targetBlobId: 'neighbor' }),
    ];
    const db = createMockDb({ blobs, links });
    const caller = createCaller(db);

    const result = await caller.site.getGraphData({
      siteId: 'site-1',
      blobId: 'focal',
    });

    const focalToNeighbor = result.links.filter(
      (l) => l.source === 'focal' && l.target === 'neighbor',
    );
    expect(focalToNeighbor).toHaveLength(1);
  });

  it('exposes title from blob metadata', async () => {
    const blobs = [
      makeBlob({
        id: 'focal',
        appPath: '/focal',
        metadata: { title: 'My Page' },
      }),
    ];
    const db = createMockDb({ blobs, links: [] });
    const caller = createCaller(db);

    const result = await caller.site.getGraphData({
      siteId: 'site-1',
      blobId: 'focal',
    });

    const node = result.nodes.find((n) => n.id === 'focal');
    expect(node?.title).toBe('My Page');
  });

  it('throws UNAUTHORIZED for a PASSWORD-protected site when no token is provided', async () => {
    const db = createMockDb({
      site: makeSite({ privacyMode: 'PASSWORD', tokenVersion: 1 }),
    });
    const caller = createCaller(db);

    await expect(
      caller.site.getGraphData({ siteId: 'site-1', blobId: 'focal' }),
    ).rejects.toThrow('Site access required');
  });
});

describe('site.getSiteTree', () => {
  // Regression: clearing the "Sidebar Paths" / "Content Hide" field in the
  // dashboard persists `null` (not `undefined`) into configJson — deepMerge
  // keeps null. That null used to flow into these inputs and fail the
  // `z.array(...).optional()` validation, so the query threw and the page
  // swallowed it into an empty (effectively hidden) sidebar. Null must be
  // treated the same as "unset": no filtering, full tree.
  it('accepts null paths/contentHide and returns the full, unfiltered tree', async () => {
    const blobs = [
      makeBlob({ id: 'a', path: 'docs/one.md', appPath: '/docs/one' }),
      makeBlob({ id: 'b', path: 'blog/two.md', appPath: '/blog/two' }),
    ];
    const db = createMockDb({ blobs });
    const caller = createCaller(db);

    const tree = await caller.site.getSiteTree({
      siteId: 'site-1',
      paths: null,
      contentHide: null,
    });

    const names = tree.map((n) => n.name);
    expect(names).toContain('docs');
    expect(names).toContain('blog');
  });
});

// Read paths that expose a PASSWORD-protected site's structure/metadata must
// enforce the password gate, not just the page-body paths.
describe('site read-path authorization', () => {
  const passwordSite = () =>
    makeSite({ privacyMode: 'PASSWORD', tokenVersion: 1 });

  const blobs = () => [
    makeBlob({
      id: 'secret-1',
      path: 'secret/plan.md',
      appPath: '/secret/plan',
      permalink: '/roadmap',
      metadata: { title: 'Secret roadmap', publish: true },
    }),
  ];

  it('getSiteTree throws UNAUTHORIZED for a PASSWORD site with no token', async () => {
    const db = createMockDb({ site: passwordSite(), blobs: blobs() });
    const caller = createCaller(db);

    await expect(caller.site.getSiteTree({ siteId: 'site-1' })).rejects.toThrow(
      'Site access required',
    );
  });

  it('getPermalinksMapping throws UNAUTHORIZED for a PASSWORD site with no token', async () => {
    const db = createMockDb({ site: passwordSite(), blobs: blobs() });
    const caller = createCaller(db);

    await expect(
      caller.site.getPermalinksMapping({ siteId: 'site-1' }),
    ).rejects.toThrow('Site access required');
  });

  it('getPermalinks throws UNAUTHORIZED for a PASSWORD site with no token', async () => {
    const db = createMockDb({ site: passwordSite(), blobs: blobs() });
    const caller = createCaller(db);

    await expect(
      caller.site.getPermalinks({ siteId: 'site-1' }),
    ).rejects.toThrow('Site access required');
  });

  it('getAllBlobPaths throws UNAUTHORIZED for a PASSWORD site with no token', async () => {
    const db = createMockDb({ site: passwordSite(), blobs: blobs() });
    const caller = createCaller(db);

    await expect(
      caller.site.getAllBlobPaths({ siteId: 'site-1' }),
    ).rejects.toThrow('Site access required');
  });

  it('getConfig throws UNAUTHORIZED for a PASSWORD site with no token', async () => {
    const db = createMockDb({ site: passwordSite(), blobs: blobs() });
    const caller = createCaller(db);

    await expect(caller.site.getConfig({ siteId: 'site-1' })).rejects.toThrow(
      'Site access required',
    );
  });

  it('getCustomStyles throws UNAUTHORIZED for a PASSWORD site with no token', async () => {
    const db = createMockDb({ site: passwordSite(), blobs: blobs() });
    const caller = createCaller(db);

    await expect(
      caller.site.getCustomStyles({ siteId: 'site-1' }),
    ).rejects.toThrow('Site access required');
  });

  it('getAuthors throws UNAUTHORIZED for a PASSWORD site with no token', async () => {
    const db = createMockDb({ site: passwordSite(), blobs: blobs() });
    const caller = createCaller(db);

    await expect(
      caller.site.getAuthors({ siteId: 'site-1', authors: ['alice'] }),
    ).rejects.toThrow('Site access required');
  });

  it('getImageDimensionsMap throws UNAUTHORIZED for a PASSWORD site with no token', async () => {
    const db = createMockDb({ site: passwordSite(), blobs: blobs() });
    const caller = createCaller(db);

    await expect(
      caller.site.getImageDimensionsMap({ siteId: 'site-1' }),
    ).rejects.toThrow('Site access required');
  });

  it('getSiteBranding stays public for a PASSWORD site (login page needs it)', async () => {
    const db = createMockDb({ site: passwordSite(), blobs: blobs() });
    const caller = createCaller(db);

    // Must NOT throw — the per-site login page renders before auth.
    await expect(
      caller.site.getSiteBranding({ siteId: 'site-1' }),
    ).resolves.not.toThrow();
  });

  it('still serves structure for PUBLIC sites without a token', async () => {
    const db = createMockDb({ blobs: blobs() });
    const caller = createCaller(db);

    const paths = await caller.site.getAllBlobPaths({ siteId: 'site-1' });
    expect(paths).toContain('/secret/plan.md');
  });

  it('serves structure to the site owner even for a PASSWORD site', async () => {
    const db = createMockDb({ site: passwordSite(), blobs: blobs() });
    const caller = createAuthenticatedCaller(db);

    const paths = await caller.site.getAllBlobPaths({ siteId: 'site-1' });
    expect(paths).toContain('/secret/plan.md');
  });
});

describe('site.getById authorization', () => {
  it('rejects an unauthenticated caller', async () => {
    const db = createMockDb();
    const caller = createCaller(db);

    await expect(caller.site.getById({ id: 'site-1' })).rejects.toThrow(
      'UNAUTHORIZED',
    );
    expect(db.site.findFirst).not.toHaveBeenCalled();
  });

  it('scopes the query to the authenticated caller as owner', async () => {
    const db = createMockDb();
    // A site not owned by the caller (or an unknown id) yields null, matching
    // the not-found contract every caller already handles.
    db.site.findFirst = vi.fn(async () => null);
    const caller = createAuthenticatedCaller(db);

    const result = await caller.site.getById({ id: 'site-1' });

    expect(result).toBeNull();
    expect(db.site.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'site-1', userId: 'user-1' }),
      }),
    );
  });
});

describe('site anonymous-lookup field narrowing', () => {
  const passwordSite = () =>
    makeSite({ privacyMode: 'PASSWORD', tokenVersion: 1 });

  const SENSITIVE_KEYS = [
    'ghRepository',
    'ghBranch',
    'rootDir',
    'plan',
    'giscusRepoId',
    'giscusCategoryId',
    'installationRepository',
    'isTemporary',
    'expiresAt',
    'anonymousOwnerId',
  ] as const;

  const expectStripped = (site: Record<string, unknown> | null) => {
    expect(site).not.toBeNull();
    // Routing/identity fields the render path and login page rely on remain.
    expect(site!.id).toBe('site-1');
    expect(site!.subdomain).toBe('my-site');
    expect(site!.projectName).toBe('my-site');
    expect(site!.privacyMode).toBe('PASSWORD');
    // Internal metadata is gone.
    for (const key of SENSITIVE_KEYS) {
      expect(site![key]).toBeUndefined();
    }
  };

  const expectFull = (site: Record<string, unknown> | null) => {
    expect(site).not.toBeNull();
    expect(site!.ghRepository).toBe('user/repo');
    expect(site!.ghBranch).toBe('main');
    expect(site!.plan).toBe('FREE');
  };

  describe('get', () => {
    it('strips sensitive fields for a PASSWORD site without a token', async () => {
      const db = createMockDb({ site: passwordSite() });
      const caller = createCaller(db);

      const site = await caller.site.get({
        username: 'testuser',
        projectName: 'my-site',
      });

      expectStripped(site);
    });

    it('returns the full record for a PUBLIC site without a token', async () => {
      const db = createMockDb({ site: makeSite() });
      const caller = createCaller(db);

      const site = await caller.site.get({
        username: 'testuser',
        projectName: 'my-site',
      });

      expectFull(site);
    });

    it('returns the full record to the owner of a PASSWORD site', async () => {
      const db = createMockDb({ site: passwordSite() });
      const caller = createAuthenticatedCaller(db);

      const site = await caller.site.get({
        username: 'testuser',
        projectName: 'my-site',
      });

      expectFull(site);
    });

    it('returns null for a missing site', async () => {
      const db = createMockDb({ site: null });
      const caller = createCaller(db);

      const site = await caller.site.get({
        username: 'nobody',
        projectName: 'nope',
      });

      expect(site).toBeNull();
    });
  });

  describe('getByDomain', () => {
    it('strips sensitive fields for a PASSWORD site without a token', async () => {
      const db = createMockDb({ site: passwordSite() });
      const caller = createCaller(db);

      const site = await caller.site.getByDomain({ domain: 'example.com' });

      expectStripped(site);
    });
  });

  describe('getAnonymous', () => {
    it('strips sensitive fields for a PASSWORD site without a token', async () => {
      const db = createMockDb({ site: passwordSite() });
      const caller = createCaller(db);

      const site = await caller.site.getAnonymous({ projectName: 'my-site' });

      expectStripped(site);
    });
  });

  describe('getMany', () => {
    it('strips sensitive fields for a PASSWORD site without a token', async () => {
      const db = createMockDb({ site: passwordSite() });
      const caller = createCaller(db);

      const sites = await caller.site.getMany({ ids: ['site-1'] });

      expect(sites).toHaveLength(1);
      expectStripped(sites[0]!);
    });

    it('returns the full record for a PUBLIC site without a token (drag-and-drop)', async () => {
      const db = createMockDb({ site: makeSite() });
      const caller = createCaller(db);

      const sites = await caller.site.getMany({ ids: ['site-1'] });

      expect(sites).toHaveLength(1);
      expectFull(sites[0]!);
    });

    it('returns an empty array for no ids without touching the db', async () => {
      const db = createMockDb({ site: makeSite() });
      const caller = createCaller(db);

      const sites = await caller.site.getMany({ ids: [] });

      expect(sites).toEqual([]);
      expect(db.site.findMany).not.toHaveBeenCalled();
    });
  });
});
