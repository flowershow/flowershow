import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/env.mjs', () => ({ env: { ANONYMOUS_JWT_SECRET: 'test-secret' } }));
vi.mock('@/server/db', () => ({ default: { site: { count: vi.fn() } } }));

import prisma from '@/server/db';
import {
  ANON_CREATE_LIMIT_PER_HOUR,
  checkAnonCreateLimit,
  hashIp,
} from './anon-rate-limit';

const count = prisma.site.count as ReturnType<typeof vi.fn>;

beforeEach(() => vi.clearAllMocks());

describe('anon create rate limit', () => {
  it('hashes IPs deterministically without exposing them', () => {
    expect(hashIp('1.2.3.4')).toBe(hashIp('1.2.3.4'));
    expect(hashIp('1.2.3.4')).not.toContain('1.2.3.4');
    expect(hashIp('1.2.3.4')).not.toBe(hashIp('1.2.3.5'));
  });

  it('is an HMAC keyed by ANON_IP_HASH_SECRET, falling back to the JWT secret', async () => {
    const { createHmac } = await import('node:crypto');
    const { env } = await import('@/env.mjs');
    const hmac = (key: string) =>
      createHmac('sha256', key).update('1.2.3.4').digest('hex');
    expect(hashIp('1.2.3.4')).toBe(hmac('test-secret'));
    (env as unknown as Record<string, string>).ANON_IP_HASH_SECRET = 'ip-key';
    try {
      expect(hashIp('1.2.3.4')).toBe(hmac('ip-key'));
    } finally {
      delete (env as unknown as Record<string, string>).ANON_IP_HASH_SECRET;
    }
  });

  it('allows below the limit and counts only the last hour', async () => {
    count.mockResolvedValue(ANON_CREATE_LIMIT_PER_HOUR - 1);
    const now = new Date('2026-10-01T12:00:00Z');
    expect(await checkAnonCreateLimit('h', now)).toBe(true);
    expect(count).toHaveBeenCalledWith({
      where: {
        anonCreatorIpHash: 'h',
        createdAt: { gt: new Date('2026-10-01T11:00:00Z') },
      },
    });
  });

  it('blocks at the limit', async () => {
    count.mockResolvedValue(ANON_CREATE_LIMIT_PER_HOUR);
    expect(await checkAnonCreateLimit('h')).toBe(false);
  });
});
