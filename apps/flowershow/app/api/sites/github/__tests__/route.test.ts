import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('@/env.mjs', () => ({
  env: {
    NEXT_PUBLIC_VERCEL_ENV: 'test',
    NEXT_PUBLIC_ROOT_DOMAIN: 'flowershow.app',
  },
}));

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

const mockValidateAccessToken = vi.fn();
const mockCheckCliVersion = vi.fn().mockReturnValue(null); // null = no error
vi.mock('@/lib/cli-auth', () => ({
  validateAccessToken: (...args: unknown[]) => mockValidateAccessToken(...args),
  checkCliVersion: (...args: unknown[]) => mockCheckCliVersion(...args),
}));

const mockCheckIfBranchExists = vi.fn();
vi.mock('@/lib/github', () => ({
  checkIfBranchExists: (...args: unknown[]) => mockCheckIfBranchExists(...args),
}));

const mockInngestSend = vi.fn().mockResolvedValue(undefined);
vi.mock('@/inngest/client', () => ({
  inngest: { send: (...args: unknown[]) => mockInngestSend(...args) },
}));

const mockEnsureSiteCollection = vi.fn().mockResolvedValue(undefined);
vi.mock('@/lib/typesense', () => ({
  ensureSiteCollection: (...args: unknown[]) =>
    mockEnsureSiteCollection(...args),
}));

const mockPostHog = {
  capture: vi.fn(),
  captureException: vi.fn(),
  shutdown: vi.fn().mockResolvedValue(undefined),
};
vi.mock('@/lib/server-posthog', () => ({
  default: () => mockPostHog,
}));

// prisma mock — will be configured per-test via mockPrisma helpers below
const mockPrismaUserFindUnique = vi.fn();
const mockPrismaInstallationFindFirst = vi.fn();
const mockPrismaSiteFindFirst = vi.fn();
const mockPrismaSiteCreate = vi.fn();

vi.mock('@/server/db', () => ({
  default: {
    user: {
      findUnique: (...args: unknown[]) => mockPrismaUserFindUnique(...args),
    },
    gitHubInstallation: {
      findFirst: (...args: unknown[]) =>
        mockPrismaInstallationFindFirst(...args),
    },
    site: {
      findFirst: (...args: unknown[]) => mockPrismaSiteFindFirst(...args),
      create: (...args: unknown[]) => mockPrismaSiteCreate(...args),
    },
  },
}));

// ── Helpers ────────────────────────────────────────────────────────────────

process.env.NEXT_PUBLIC_ROOT_DOMAIN = 'flowershow.app';

function makeRequest(body: unknown) {
  return new NextRequest('https://flowershow.app/api/sites/github', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const validBody = {
  ghRepository: 'ada/my-notes',
  ghBranch: 'main',
  installationId: 'inst-1',
};

const mockSite = {
  id: 'site-1',
  projectName: 'my-notes',
  ghRepository: 'ada/my-notes',
  ghBranch: 'main',
  rootDir: null,
  autoSync: true,
  userId: 'user-1',
  installationId: 'inst-1',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

// ── Tests ──────────────────────────────────────────────────────────────────

// Import AFTER mocks are set up
const { POST } = await import('../route.js');

describe('POST /api/sites/github', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckCliVersion.mockReturnValue(null);
    mockValidateAccessToken.mockResolvedValue({ userId: 'user-1' });
    mockPrismaUserFindUnique.mockResolvedValue({ username: 'ada' });
    mockPrismaInstallationFindFirst.mockResolvedValue({
      id: 'inst-1',
      userId: 'user-1',
    });
    mockCheckIfBranchExists.mockResolvedValue(true);
    mockPrismaSiteFindFirst.mockResolvedValue(null); // no name conflict by default
    mockPrismaSiteCreate.mockResolvedValue(mockSite);
  });

  it('creates a site and returns 201', async () => {
    const res = await POST(makeRequest(validBody));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.site.id).toBe('site-1');
    expect(body.site.projectName).toBe('my-notes');
    expect(body.site.ghRepository).toBe('ada/my-notes');
    expect(body.site.ghBranch).toBe('main');
    expect(body.site.url).toBe('https://flowershow.app/@ada/my-notes');
  });

  it('triggers an inngest sync after creation', async () => {
    await POST(makeRequest(validBody));

    expect(mockInngestSend).toHaveBeenCalledOnce();
    expect(mockInngestSend).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'site/sync',
        data: expect.objectContaining({
          siteId: 'site-1',
          ghRepository: 'ada/my-notes',
          ghBranch: 'main',
          installationId: 'inst-1',
        }),
      }),
    );
  });

  it('uses projectName from request body when supplied', async () => {
    mockPrismaSiteCreate.mockResolvedValue({
      ...mockSite,
      projectName: 'custom-name',
    });

    const res = await POST(
      makeRequest({ ...validBody, projectName: 'custom-name' }),
    );
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.site.projectName).toBe('custom-name');
  });

  it('disambiguates duplicate project names with a numeric suffix', async () => {
    // First call (name conflict check) returns an existing site; second call returns null
    mockPrismaSiteFindFirst
      .mockResolvedValueOnce({ id: 'existing' }) // 'my-notes' is taken
      .mockResolvedValueOnce(null); // 'my-notes-2' is free

    mockPrismaSiteCreate.mockResolvedValue({
      ...mockSite,
      projectName: 'my-notes-2',
    });

    const res = await POST(makeRequest(validBody));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.site.projectName).toBe('my-notes-2');
  });

  describe('authentication', () => {
    it('returns 401 when no bearer token is provided', async () => {
      mockValidateAccessToken.mockResolvedValue(null);

      const res = await POST(makeRequest(validBody));
      expect(res.status).toBe(401);
    });

    it('returns the CLI version error response when the client is outdated', async () => {
      const versionErrorResponse = new Response(
        JSON.stringify({ error: 'client_outdated' }),
        { status: 426 },
      );
      mockCheckCliVersion.mockReturnValue(versionErrorResponse);

      const res = await POST(makeRequest(validBody));
      expect(res.status).toBe(426);
    });
  });

  describe('request validation', () => {
    it('returns 400 when ghRepository is missing', async () => {
      const res = await POST(
        makeRequest({ ghBranch: 'main', installationId: 'inst-1' }),
      );
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('invalid_request');
    });

    it('returns 400 when ghBranch is missing', async () => {
      const res = await POST(
        makeRequest({ ghRepository: 'ada/my-notes', installationId: 'inst-1' }),
      );
      expect(res.status).toBe(400);
    });

    it('returns 400 when installationId is missing', async () => {
      const res = await POST(
        makeRequest({ ghRepository: 'ada/my-notes', ghBranch: 'main' }),
      );
      expect(res.status).toBe(400);
    });
  });

  describe('user checks', () => {
    it('returns 400 when the authenticated user has no username', async () => {
      mockPrismaUserFindUnique.mockResolvedValue({ username: null });

      const res = await POST(makeRequest(validBody));
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('no_username');
    });
  });

  describe('installation checks', () => {
    it('returns 404 when the installation does not exist', async () => {
      mockPrismaInstallationFindFirst.mockResolvedValue(null);

      const res = await POST(makeRequest(validBody));
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error).toBe('installation_not_found');
    });
  });

  describe('branch checks', () => {
    it('returns 400 when the branch does not exist', async () => {
      mockCheckIfBranchExists.mockResolvedValue(false);

      const res = await POST(makeRequest(validBody));
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('branch_not_found');
    });

    it('passes the installationId (not an OAuth token) to checkIfBranchExists', async () => {
      await POST(makeRequest(validBody));

      expect(mockCheckIfBranchExists).toHaveBeenCalledWith(
        expect.objectContaining({
          installationId: 'inst-1',
          ghRepository: 'ada/my-notes',
          ghBranch: 'main',
        }),
      );
    });
  });
});
