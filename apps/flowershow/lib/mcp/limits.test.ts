import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeDb as db } from '@/lib/oauth/fake-db';

const mockEnv = vi.hoisted(() => ({
  env: {
    ANONYMOUS_JWT_SECRET: 'test-secret',
    NEXT_PUBLIC_HOME_DOMAIN: 'flowershow.app',
    NEXT_PUBLIC_VERCEL_ENV: 'production',
    MCP_OAUTH_ENABLED: 'true' as string | undefined,
  },
}));
vi.mock('@/env.mjs', () => mockEnv);
vi.mock('@/server/db', async () => ({
  default: (await import('@/lib/oauth/fake-db')).fakeDb,
}));
const capture = vi.hoisted(() => vi.fn());
vi.mock('@/lib/server-posthog', () => ({
  default: () => ({ capture, shutdown: vi.fn() }),
}));

import {
  anonCallerFrom,
  checkAnonCreateLimits,
  checkAnonUpdateLimit,
  MCP_ANON_LIMITS,
  reportGlobalLimitReached,
  signInHint,
} from './limits';

const now = new Date('2026-10-18T10:15:00Z');
const ANTHROPIC_IP = '160.79.104.10';

async function createMany(
  caller: Parameters<typeof checkAnonCreateLimits>[0],
  n: number,
) {
  const out: (string | null)[] = [];
  for (let i = 0; i < n; i++)
    out.push(await checkAnonCreateLimits(caller, now));
  return out;
}

beforeEach(() => {
  db.reset();
  capture.mockClear();
  mockEnv.env.MCP_OAUTH_ENABLED = 'true';
});

describe('anonCallerFrom', () => {
  it("prefers ChatGPT's anonymized user id", () => {
    const caller = anonCallerFrom(
      '1.2.3.4',
      new Headers({ 'mcp-session-id': 's1' }),
      { params: { _meta: { 'openai/subject': 'u-123' } } },
    );
    expect(caller).toEqual({ ip: '1.2.3.4', callerId: 'openai:u-123' });
  });

  it('falls back to the MCP session id, then to none', () => {
    expect(
      anonCallerFrom('1.2.3.4', new Headers({ 'mcp-session-id': 's1' }), {})
        .callerId,
    ).toBe('session:s1');
    expect(anonCallerFrom('1.2.3.4', new Headers(), undefined).callerId).toBe(
      null,
    );
  });
});

describe('checkAnonCreateLimits', () => {
  it('limits each caller separately on a shared platform IP', async () => {
    const alice = { ip: ANTHROPIC_IP, callerId: 'session:alice' };
    const bob = { ip: ANTHROPIC_IP, callerId: 'session:bob' };
    const results = await createMany(alice, MCP_ANON_LIMITS.perCaller + 1);
    expect(results.slice(0, -1).every((r) => r === null)).toBe(true);
    expect(results.at(-1)).toBe('caller');
    // Bob, on the same Anthropic egress IP, is unaffected.
    expect(await checkAnonCreateLimits(bob, now)).toBeNull();
  });

  it('limits a non-platform IP even when it rotates caller ids', async () => {
    const results: (string | null)[] = [];
    for (let i = 0; i <= MCP_ANON_LIMITS.perIp; i++) {
      results.push(
        await checkAnonCreateLimits(
          { ip: '203.0.113.7', callerId: `session:${i}` },
          now,
        ),
      );
    }
    expect(results.at(-2)).toBeNull();
    expect(results.at(-1)).toBe('ip');
  });

  it('does not limit platform IPs per IP', async () => {
    for (let i = 0; i < MCP_ANON_LIMITS.perIp + 5; i++) {
      expect(
        await checkAnonCreateLimits(
          { ip: ANTHROPIC_IP, callerId: `session:${i}` },
          now,
        ),
      ).toBeNull();
    }
  });

  it('starts afresh in the next hour', async () => {
    const caller = { ip: ANTHROPIC_IP, callerId: 'session:alice' };
    await createMany(caller, MCP_ANON_LIMITS.perCaller + 1);
    const later = new Date(now.getTime() + 60 * 60 * 1000);
    expect(await checkAnonCreateLimits(caller, later)).toBeNull();
  });
});

describe('checkAnonUpdateLimit', () => {
  it('limits publishes per site', async () => {
    for (let i = 0; i < MCP_ANON_LIMITS.perSiteUpdates; i++) {
      expect(await checkAnonUpdateLimit('site-1', now)).toBe(true);
    }
    expect(await checkAnonUpdateLimit('site-1', now)).toBe(false);
    expect(await checkAnonUpdateLimit('site-2', now)).toBe(true);
  });
});

describe('reportGlobalLimitReached', () => {
  it('sends one PostHog event per hour', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    await reportGlobalLimitReached(100, now);
    await reportGlobalLimitReached(100, now);
    expect(capture).toHaveBeenCalledTimes(1);
    expect(capture).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'mcp_anon_global_limit_reached',
        properties: { limit: 100 },
      }),
    );
    await reportGlobalLimitReached(100, new Date(now.getTime() + 3_600_000));
    expect(capture).toHaveBeenCalledTimes(2);
  });
});

describe('signInHint', () => {
  it('points at the signed-in connector', () => {
    expect(signInHint()).toContain('https://flowershow.app/api/mcp/account');
  });

  it('falls back to a generic hint when OAuth is off', () => {
    mockEnv.env.MCP_OAUTH_ENABLED = undefined;
    expect(signInHint()).not.toContain('/api/mcp/account');
  });
});
