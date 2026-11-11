import { describe, expect, it, vi } from 'vitest';

vi.mock('@/server/db', () => ({ default: {}, db: {} }));
vi.mock('next/cache', () => ({
  unstable_cache: (fn: (...a: unknown[]) => unknown) => fn,
}));

import { getPeopleBySite } from './people-by-site';
import type { UmamiClient } from './umami-client';

const now = new Date('2026-12-20T15:00:00Z');

const rows = (prefix: string, n: number, start = 0) =>
  Array.from({ length: n }, (_, i) => ({
    name: `${prefix}${start + i}`,
    pageviews: 10,
    visitors: start + i + 1,
  }));

const fakeClient = (metrics: ReturnType<typeof vi.fn>) =>
  ({ metrics }) as unknown as UmamiClient;

describe('getPeopleBySite', () => {
  it('pages through tags until a short page and finds a site on page 2', async () => {
    const metrics = vi
      .fn()
      .mockResolvedValueOnce(rows('s', 500))
      .mockResolvedValueOnce(rows('s', 3, 500));
    const out = await getPeopleBySite(['s0', 's501'], {
      client: fakeClient(metrics),
      now,
    });
    expect(metrics).toHaveBeenCalledTimes(2);
    expect(metrics.mock.calls[0]![0]).toMatchObject({
      type: 'tag',
      limit: 500,
      offset: 0,
    });
    expect(metrics.mock.calls[1]![0]).toMatchObject({
      type: 'tag',
      limit: 500,
      offset: 500,
    });
    expect(out).toEqual({ s0: 1, s501: 502 });
  });

  it('maps listed sites without a row to 0 and leaves out others', async () => {
    const metrics = vi.fn().mockResolvedValueOnce(rows('s', 2));
    const out = await getPeopleBySite(['s1', 'missing'], {
      client: fakeClient(metrics),
      now,
    });
    expect(out).toEqual({ s1: 2, missing: 0 });
    expect(out).not.toHaveProperty('s0');
  });

  it('uses the last 30 UTC days', async () => {
    const metrics = vi.fn().mockResolvedValueOnce([]);
    await getPeopleBySite(['a'], { client: fakeClient(metrics), now });
    const w = metrics.mock.calls[0]![0];
    expect(new Date(w.startAt).toISOString()).toBe('2026-11-21T00:00:00.000Z');
    expect(w.endAt).toBe(now.getTime());
  });

  it('returns null when a call rejects', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const metrics = vi.fn().mockRejectedValue(new Error('boom'));
    expect(
      await getPeopleBySite(['a'], { client: fakeClient(metrics), now }),
    ).toBeNull();
    spy.mockRestore();
  });

  it('returns null when there is no client', async () => {
    expect(await getPeopleBySite(['a'], { client: null, now })).toBeNull();
  });
});
