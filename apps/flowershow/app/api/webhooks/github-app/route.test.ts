import { createHmac } from 'crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { WEBHOOK_SECRET, afterCallbacks } = vi.hoisted(() => ({
  WEBHOOK_SECRET: 'test-webhook-secret',
  afterCallbacks: [] as Array<() => unknown>,
}));

vi.mock('next/server', async (importActual) => {
  const actual = await importActual<typeof import('next/server')>();
  return {
    ...actual,
    after: vi.fn((cb: () => unknown) => {
      afterCallbacks.push(cb);
    }),
  };
});

vi.mock('@/env.mjs', () => ({
  env: {
    GITHUB_APP_WEBHOOK_SECRET: WEBHOOK_SECRET,
    CF_WORKER_URL: 'http://worker.test',
    CF_WORKER_SECRET: 'cf-secret',
  },
}));

vi.mock('@/lib/cloudflare-worker', () => ({
  triggerGitHubSyncWorkflow: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/github', () => ({
  clearInstallationTokenCache: vi.fn(),
  getInstallationToken: vi.fn(),
}));

vi.mock('@/lib/otel-logger', () => ({
  log: vi.fn(),
  flushLogs: vi.fn().mockResolvedValue(undefined),
  SeverityNumber: { INFO: 9, WARN: 13, ERROR: 17 },
}));

vi.mock('@/lib/server-posthog', () => ({
  default: () => ({
    capture: vi.fn(),
    captureException: vi.fn(),
    shutdown: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock('@/server/db', () => ({
  default: {
    gitHubInstallation: { findFirst: vi.fn() },
    site: { findMany: vi.fn() },
  },
}));

import { triggerGitHubSyncWorkflow } from '@/lib/cloudflare-worker';
import { flushLogs } from '@/lib/otel-logger';
import prisma from '@/server/db';
import { POST } from './route';

function sign(body: string) {
  return (
    'sha256=' + createHmac('sha256', WEBHOOK_SECRET).update(body).digest('hex')
  );
}

function makeRequest(
  event: string,
  payload: unknown,
  { signature }: { signature?: string | null } = {},
) {
  const body = JSON.stringify(payload);
  const headers: Record<string, string> = { 'x-github-event': event };
  const sig = signature === undefined ? sign(body) : signature;
  if (sig !== null) headers['x-hub-signature-256'] = sig;
  return new Request('http://localhost/api/webhooks/github-app', {
    method: 'POST',
    headers,
    body,
  });
}

function pushPayload(overrides: Record<string, unknown> = {}) {
  return {
    ref: 'refs/heads/main',
    after: 'commit-sha-123',
    head_commit: { message: 'a commit message' },
    repository: {
      id: 42,
      name: 'repo',
      full_name: 'owner/repo',
      private: false,
      owner: { login: 'owner' },
    },
    installation: {
      id: 99,
      account: { id: 1, login: 'owner', type: 'User' },
      repository_selection: 'all',
      suspended_at: null,
      suspended_by: null,
    },
    ...overrides,
  };
}

function makeSite(overrides: Record<string, unknown> = {}) {
  return {
    id: 'site-1',
    userId: 'user-1',
    ghRepository: 'owner/repo',
    ghBranch: 'main',
    rootDir: null,
    installationRepository: { installationId: 'inst-db-1' },
    ...overrides,
  };
}

async function runDeferred() {
  for (const cb of afterCallbacks) await cb();
}

beforeEach(() => {
  vi.clearAllMocks();
  afterCallbacks.length = 0;
  vi.mocked(prisma.gitHubInstallation.findFirst).mockResolvedValue({
    id: 'inst-db-1',
  } as any);
  vi.mocked(prisma.site.findMany).mockResolvedValue([makeSite()] as any);
});

describe('github-app webhook — fast ACK', () => {
  it('acknowledges a push with 200 without running the sync on the critical path', async () => {
    const res = await POST(makeRequest('push', pushPayload()));

    expect(res.status).toBe(200);
    expect(afterCallbacks.length).toBe(1);
    expect(triggerGitHubSyncWorkflow).not.toHaveBeenCalled();
    expect(prisma.gitHubInstallation.findFirst).not.toHaveBeenCalled();
    expect(flushLogs).not.toHaveBeenCalled();
  });

  it('triggers a sync for each matching site when the deferred task runs', async () => {
    vi.mocked(prisma.site.findMany).mockResolvedValue([
      makeSite({ id: 'site-1' }),
      makeSite({ id: 'site-2' }),
    ] as any);

    await POST(makeRequest('push', pushPayload()));
    await runDeferred();

    expect(triggerGitHubSyncWorkflow).toHaveBeenCalledTimes(2);
    expect(triggerGitHubSyncWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({
        siteId: 'site-1',
        ghRepository: 'owner/repo',
        ghBranch: 'main',
        gitCommitSha: 'commit-sha-123',
        githubInstallationId: '99',
      }),
    );
  });

  it('flushes telemetry inside the deferred task, not before the response', async () => {
    await POST(makeRequest('push', pushPayload()));
    expect(flushLogs).not.toHaveBeenCalled();

    await runDeferred();
    expect(flushLogs).toHaveBeenCalled();
  });

  it('rejects a request with no signature and defers nothing', async () => {
    const res = await POST(
      makeRequest('push', pushPayload(), { signature: null }),
    );

    expect(res.status).toBe(401);
    expect(afterCallbacks.length).toBe(0);
    expect(triggerGitHubSyncWorkflow).not.toHaveBeenCalled();
  });

  it('rejects a request with an invalid signature and defers nothing', async () => {
    const res = await POST(
      makeRequest('push', pushPayload(), { signature: 'sha256=deadbeef' }),
    );

    expect(res.status).toBe(401);
    expect(afterCallbacks.length).toBe(0);
    expect(triggerGitHubSyncWorkflow).not.toHaveBeenCalled();
  });

  it('acknowledges an unhandled event type and triggers no sync', async () => {
    const res = await POST(makeRequest('ping', { zen: 'hi' }));

    expect(res.status).toBe(200);
    await runDeferred();
    expect(triggerGitHubSyncWorkflow).not.toHaveBeenCalled();
  });

  it('contains a downstream failure in the deferred task without affecting the ACK', async () => {
    vi.mocked(prisma.gitHubInstallation.findFirst).mockRejectedValue(
      new Error('db down'),
    );

    const res = await POST(makeRequest('push', pushPayload()));
    expect(res.status).toBe(200);

    await expect(runDeferred()).resolves.toBeUndefined();
    expect(flushLogs).toHaveBeenCalled();
  });
});
