import { describe, expect, it } from 'vitest';
import {
  anonRobots,
  anonRobotsHeaders,
  isExpiredTemporarySite,
} from './anonymous-site';

describe('anonRobots', () => {
  it('returns noindex robots metadata for an anonymous site', () => {
    expect(anonRobots({ isTemporary: true, anonymousOwnerId: 'x' })).toEqual({
      robots: { index: false, follow: false },
    });
  });

  it('returns nothing for a normal site', () => {
    expect(anonRobots({ isTemporary: false, anonymousOwnerId: null })).toEqual(
      {},
    );
    expect(anonRobots({ isTemporary: true, anonymousOwnerId: null })).toEqual(
      {},
    );
    expect(anonRobots({})).toEqual({});
  });
});

describe('isExpiredTemporarySite', () => {
  const now = new Date('2026-10-01T00:00:00Z');
  const past = new Date('2026-09-30T00:00:00Z');
  const future = new Date('2026-10-02T00:00:00Z');

  it('is true only for a temporary site past its expiry', () => {
    expect(
      isExpiredTemporarySite({ isTemporary: true, expiresAt: past }, now),
    ).toBe(true);
    expect(
      isExpiredTemporarySite({ isTemporary: true, expiresAt: future }, now),
    ).toBe(false);
    expect(
      isExpiredTemporarySite({ isTemporary: false, expiresAt: past }, now),
    ).toBe(false);
    expect(
      isExpiredTemporarySite({ isTemporary: true, expiresAt: null }, now),
    ).toBe(false);
  });
});

describe('anonRobotsHeaders', () => {
  it('sets noindex only for anonymous sites', () => {
    expect(
      anonRobotsHeaders({ isTemporary: true, anonymousOwnerId: 'x' }),
    ).toEqual({ 'X-Robots-Tag': 'noindex' });
    expect(
      anonRobotsHeaders({ isTemporary: false, anonymousOwnerId: null }),
    ).toEqual({});
  });
});
