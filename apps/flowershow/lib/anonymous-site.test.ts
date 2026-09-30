import { describe, expect, it } from 'vitest';
import { anonRobots } from './anonymous-site';

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
