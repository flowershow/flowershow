import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── Hoisted mocks ─────────────────────────────────────────────────

const mocks = vi.hoisted(() => ({
  prisma: {
    publishFile: {
      updateMany: vi.fn(),
    },
  },
}));

// ── Module mocks ──────────────────────────────────────────────────

vi.mock('@/env.mjs', () => ({
  env: {
    INNGEST_APP_ID: 'test',
    NEXT_PUBLIC_VERCEL_ENV: 'test',
  },
}));

vi.mock('@/server/db', () => ({ default: mocks.prisma }));

vi.mock('next/cache', () => ({ revalidateTag: vi.fn() }));
vi.mock('@/lib/typesense', () => ({
  createSiteCollection: vi.fn(),
  deleteSiteCollection: vi.fn(),
  siteCollectionExists: vi.fn(),
}));
vi.mock('@/lib/content-store', () => ({
  deleteProject: vi.fn(),
  uploadFile: vi.fn(),
}));
vi.mock('@/lib/blob-cleanup', () => ({ deleteBlobs: vi.fn() }));
vi.mock('@/lib/github', () => ({
  fetchGitHubFileRaw: vi.fn(),
  fetchGitHubRepoTree: vi.fn(),
  getInstallationToken: vi.fn(),
  githubJsonFetch: vi.fn(),
}));
vi.mock('@/lib/otel-logger', () => ({ log: vi.fn(), SeverityNumber: {} }));
vi.mock('@/lib/path-validator', () => ({ isPathVisible: vi.fn() }));
vi.mock('@/lib/resolve-link', () => ({ resolveFilePathToUrlPath: vi.fn() }));

vi.mock('@/inngest/client', () => ({
  inngest: {
    createFunction: (
      _config: unknown,
      _trigger: unknown,
      handler: (...args: unknown[]) => unknown,
    ) => handler,
  },
}));

// ── Import after mocks ────────────────────────────────────────────

import { cleanupExpiredPublishFiles } from '../functions';

// ── Helpers ───────────────────────────────────────────────────────

type StepLike = { run: (_name: string, fn: () => unknown) => unknown };

/** Creates a step mock that immediately executes the callback */
function makeStep(): StepLike {
  return {
    run: (_name: string, fn: () => unknown) => fn(),
  };
}

type InngestHandler = (args: { step: StepLike }) => Promise<unknown>;

// ── Tests ─────────────────────────────────────────────────────────

describe('cleanupExpiredPublishFiles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('marks uploading rows past presignedUrlExpiresAt as error', async () => {
    mocks.prisma.publishFile.updateMany.mockResolvedValue({ count: 3 });

    const result = await (cleanupExpiredPublishFiles as InngestHandler)({
      step: makeStep(),
    });

    expect(mocks.prisma.publishFile.updateMany).toHaveBeenCalledOnce();

    const call = mocks.prisma.publishFile.updateMany.mock.calls[0][0];
    expect(call.where.status).toBe('uploading');
    expect(call.where.presignedUrlExpiresAt).toEqual(
      expect.objectContaining({ lt: expect.any(Date) }),
    );
    expect(call.data.status).toBe('error');
    expect(call.data.error).toBe('upload expired');

    expect(result).toEqual({ expired: 3 });
  });

  it('returns expired: 0 when no rows have expired', async () => {
    mocks.prisma.publishFile.updateMany.mockResolvedValue({ count: 0 });

    const result = await (cleanupExpiredPublishFiles as InngestHandler)({
      step: makeStep(),
    });

    expect(result).toEqual({ expired: 0 });
  });

  it('filters only by uploading status — does not touch success or error rows', async () => {
    mocks.prisma.publishFile.updateMany.mockResolvedValue({ count: 0 });

    await (cleanupExpiredPublishFiles as InngestHandler)({ step: makeStep() });

    const call = mocks.prisma.publishFile.updateMany.mock.calls[0][0];
    expect(call.where.status).toBe('uploading');
  });
});
