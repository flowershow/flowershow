import { describe, expect, it } from 'vitest';
import {
  buildClaimCallbackUrl,
  buildClaimLoginUrl,
  clearStashedClaimToken,
  parseClaimLink,
  readStashedClaimToken,
  stashClaimToken,
} from './claim-url';

const base = { protocol: 'https', homeDomain: 'flowershow.app' };

const HOUR = 60 * 60 * 1000;

function fakeStorage() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
    m,
  };
}

describe('parseClaimLink', () => {
  it('reads the token from the fragment', () => {
    expect(
      parseClaimLink({ search: '?siteId=s1', hash: '#token=fs_claim_a.b-c' }),
    ).toEqual({ siteId: 's1', token: 'fs_claim_a.b-c' });
  });

  it('still accepts a token in the query (older links)', () => {
    expect(
      parseClaimLink({ search: '?siteId=s1&token=fs_claim_q', hash: '' }),
    ).toEqual({ siteId: 's1', token: 'fs_claim_q' });
  });

  it('returns nulls when absent', () => {
    expect(parseClaimLink({ search: '', hash: '' })).toEqual({
      siteId: null,
      token: null,
    });
  });
});

describe('claim token stash (survives the login round-trip)', () => {
  it('stores, reads and clears per site', () => {
    const s = fakeStorage();
    stashClaimToken(s, 's1', 'fs_claim_x');
    expect(readStashedClaimToken(s, 's1')).toBe('fs_claim_x');
    expect(readStashedClaimToken(s, 's2')).toBeNull();
    clearStashedClaimToken(s, 's1');
    expect(readStashedClaimToken(s, 's1')).toBeNull();
  });

  it('never throws when storage is unavailable', () => {
    const broken = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
      removeItem: () => {
        throw new Error('blocked');
      },
    };
    expect(() => stashClaimToken(broken, 's1', 't')).not.toThrow();
    expect(readStashedClaimToken(broken, 's1')).toBeNull();
    expect(() => clearStashedClaimToken(broken, 's1')).not.toThrow();
    expect(readStashedClaimToken(null, 's1')).toBeNull();
  });

  it('ignores and removes a stashed token older than a day', () => {
    const s = fakeStorage();
    stashClaimToken(s, 's1', 'fs_claim_x', 0);
    expect(readStashedClaimToken(s, 's1', 23 * HOUR)).toBe('fs_claim_x');
    expect(readStashedClaimToken(s, 's1', 25 * HOUR)).toBeNull();
    expect(s.m.size).toBe(0);
  });

  it('ignores a malformed stash entry', () => {
    const s = fakeStorage();
    s.setItem('flowershow_claim_token:s1', 'not json');
    expect(readStashedClaimToken(s, 's1')).toBeNull();
  });
});

describe('buildClaimCallbackUrl', () => {
  it('carries only the siteId, never a token', () => {
    expect(buildClaimCallbackUrl({ ...base, siteId: 's 1' })).toBe(
      'https://flowershow.app/claim?siteId=s+1',
    );
    expect(buildClaimCallbackUrl({ ...base, siteId: null })).toBe(
      'https://flowershow.app/claim',
    );
  });
});

describe('buildClaimLoginUrl', () => {
  it('points at the cloud login page with the callbackUrl encoded', () => {
    const callbackUrl = buildClaimCallbackUrl({ ...base, siteId: 's1' });
    const parsed = new URL(
      buildClaimLoginUrl({
        protocol: 'https',
        cloudDomain: 'cloud.flowershow.app',
        callbackUrl,
      }),
    );
    expect(parsed.origin).toBe('https://cloud.flowershow.app');
    expect(parsed.pathname).toBe('/login');
    expect(parsed.searchParams.get('callbackUrl')).toBe(callbackUrl);
  });
});
