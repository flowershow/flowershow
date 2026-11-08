import type { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/server')>()),
  after: (task: unknown) => (typeof task === 'function' ? task() : task),
}));
vi.mock('@/lib/cli-auth', () => ({ validateAccessToken: vi.fn() }));
vi.mock('@/lib/server-posthog', () => {
  const client = {
    capture: vi.fn(),
    shutdown: vi.fn().mockResolvedValue(undefined),
  };
  return { default: () => client, __esModule: true };
});

import { validateAccessToken } from '@/lib/cli-auth';
import PostHogClient from '@/lib/server-posthog';
import { PREMIUM_REQUIRED_MESSAGE } from '@/lib/site-authz';
import { authorizeSiteManager, errorResponse, track } from './http';

const validateToken = validateAccessToken as ReturnType<typeof vi.fn>;
const request = {
  headers: new Headers({ authorization: 'Bearer fs_pat_x' }),
} as NextRequest;
const SITE = {
  id: 'site-1',
  userId: 'owner-1',
  plan: 'FREE' as 'FREE' | 'PREMIUM',
  members: [] as { userId: string }[],
};

beforeEach(() => vi.clearAllMocks());

describe('errorResponse', () => {
  it('returns the status with an error code and message', async () => {
    const res = errorResponse(409, 'limit_reached', 'Full');
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({
      error: 'limit_reached',
      message: 'Full',
    });
  });
});

describe('authorizeSiteManager', () => {
  it('returns the site and user id for the owner', async () => {
    validateToken.mockResolvedValue({ userId: 'owner-1' });
    expect(
      await authorizeSiteManager(request, 'site-1', async () => SITE),
    ).toEqual({
      site: SITE,
      userId: 'owner-1',
    });
  });

  it('401s on a bad token without loading the site', async () => {
    validateToken.mockResolvedValue(null);
    const loadSite = vi.fn();
    const result = await authorizeSiteManager(request, 'site-1', loadSite);
    expect('response' in result && result.response.status).toBe(401);
    expect(loadSite).not.toHaveBeenCalled();
  });

  it('404s for a missing site and 403s for another user', async () => {
    validateToken.mockResolvedValue({ userId: 'owner-1' });
    const missing = await authorizeSiteManager(
      request,
      'site-1',
      async () => null,
    );
    expect('response' in missing && missing.response.status).toBe(404);
    validateToken.mockResolvedValue({ userId: 'intruder' });
    const other = await authorizeSiteManager(
      request,
      'site-1',
      async () => SITE,
    );
    expect('response' in other && other.response.status).toBe(403);
    expect('response' in other && (await other.response.json()).error).toBe(
      'forbidden',
    );
  });

  it('passes the authenticated userId to loadSite', async () => {
    validateToken.mockResolvedValue({ userId: 'ed-1' });
    const loadSite = vi.fn().mockResolvedValue({
      ...SITE,
      plan: 'PREMIUM',
      members: [{ userId: 'ed-1' }],
    });
    const result = await authorizeSiteManager(request, 'site-1', loadSite);
    expect(loadSite).toHaveBeenCalledWith('ed-1');
    expect('userId' in result && result.userId).toBe('ed-1');
  });

  it("returns premium_required for a lapsed editor's bearer token", async () => {
    validateToken.mockResolvedValue({ userId: 'ed-1' });
    const result = await authorizeSiteManager(request, 'site-1', async () => ({
      ...SITE,
      plan: 'FREE' as const,
      members: [{ userId: 'ed-1' }],
    }));
    if (!('response' in result)) throw new Error('expected a response');
    expect(result.response.status).toBe(403);
    expect(await result.response.json()).toEqual({
      error: 'premium_required',
      message: PREMIUM_REQUIRED_MESSAGE,
    });
  });
});

describe('track', () => {
  it('captures the event and flushes the client', async () => {
    track('site:site-1', 'annotation_created', { siteId: 'site-1' });
    await Promise.resolve();
    const posthog = PostHogClient();
    expect(posthog.capture).toHaveBeenCalledWith({
      distinctId: 'site:site-1',
      event: 'annotation_created',
      properties: { siteId: 'site-1' },
    });
    expect(posthog.shutdown).toHaveBeenCalled();
  });
});
