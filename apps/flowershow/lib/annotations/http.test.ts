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
import { authorizeOwner, errorResponse, track } from './http';

const validateToken = validateAccessToken as ReturnType<typeof vi.fn>;
const request = {} as NextRequest;
const SITE = { id: 'site-1', userId: 'owner-1' };

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

describe('authorizeOwner', () => {
  it('returns the site and user id for the owner', async () => {
    validateToken.mockResolvedValue({ userId: 'owner-1' });
    expect(await authorizeOwner(request, async () => SITE)).toEqual({
      site: SITE,
      userId: 'owner-1',
    });
  });

  it('401s on a bad token without loading the site', async () => {
    validateToken.mockResolvedValue(null);
    const loadSite = vi.fn();
    const result = await authorizeOwner(request, loadSite);
    expect('response' in result && result.response.status).toBe(401);
    expect(loadSite).not.toHaveBeenCalled();
  });

  it('404s for a missing site and 403s for another user', async () => {
    validateToken.mockResolvedValue({ userId: 'owner-1' });
    const missing = await authorizeOwner(request, async () => null);
    expect('response' in missing && missing.response.status).toBe(404);
    validateToken.mockResolvedValue({ userId: 'intruder' });
    const other = await authorizeOwner(request, async () => SITE);
    expect('response' in other && other.response.status).toBe(403);
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
