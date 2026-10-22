import { describe, expect, it } from 'vitest';
import {
  decideClaimAction,
  describeClaimFailure,
  formatClaimExpiry,
  scrubbedClaimPath,
} from './claim-flow';

describe('describeClaimFailure', () => {
  it.each([409, 410, 404, 400])(
    'gives a final, user-facing message for %s and forgets the link',
    (status) => {
      const f = describeClaimFailure(status);
      expect(f.retryable).toBe(false);
      expect(f.clearStash).toBe(true);
      expect(f.message).not.toMatch(/Ownership verification|Site is not/);
    },
  );

  it('keeps the link and offers a retry for our own cross-origin 403', () => {
    expect(describeClaimFailure(403, 'cross_origin')).toMatchObject({
      retryable: true,
      clearStash: false,
    });
  });

  it('treats any other 403 as an invalid link', () => {
    expect(describeClaimFailure(403)).toMatchObject({
      retryable: false,
      clearStash: true,
    });
  });

  it.each([500, 502, null])(
    'offers a retry for server/network errors (%s)',
    (status) => {
      expect(describeClaimFailure(status)).toMatchObject({
        retryable: true,
        clearStash: false,
      });
    },
  );
});

describe('formatClaimExpiry', () => {
  it('formats an ISO date and rejects bad input', () => {
    expect(formatClaimExpiry('2026-10-07T12:00:00Z')).toContain('2026');
    expect(formatClaimExpiry('nope')).toBeNull();
    expect(formatClaimExpiry(null)).toBeNull();
  });
});

const base = {
  siteId: 's1',
  linkToken: null as string | null,
  hasOwnershipToken: false,
};

describe('decideClaimAction', () => {
  it('waits while the session is loading', () => {
    expect(
      decideClaimAction({ ...base, status: 'loading', linkToken: 't' }),
    ).toBe('wait');
  });

  it('sends unauthenticated visitors to login (token kept for the redirect)', () => {
    expect(
      decideClaimAction({
        ...base,
        status: 'unauthenticated',
        linkToken: 'fs_claim_x',
      }),
    ).toBe('login');
  });

  it('never auto-claims a token from the URL: asks for confirmation', () => {
    expect(
      decideClaimAction({
        ...base,
        status: 'authenticated',
        linkToken: 'fs_claim_x',
        hasOwnershipToken: true,
      }),
    ).toBe('confirm');
  });

  it('auto-claims with the browser ownership token (drag-and-drop flow)', () => {
    expect(
      decideClaimAction({
        ...base,
        status: 'authenticated',
        hasOwnershipToken: true,
      }),
    ).toBe('auto-claim');
  });

  it('asks to reopen the link when only the siteId survived (e.g. login finished in another browser)', () => {
    expect(decideClaimAction({ ...base, status: 'authenticated' })).toBe(
      'reopen-link',
    );
  });

  it('reports missing information', () => {
    expect(
      decideClaimAction({
        ...base,
        status: 'authenticated',
        siteId: null,
        linkToken: 'fs_claim_x',
      }),
    ).toBe('missing');
  });
});

describe('scrubbedClaimPath', () => {
  it('keeps the siteId and drops the token', () => {
    expect(scrubbedClaimPath('/claim', 's 1')).toBe('/claim?siteId=s+1');
  });

  it('returns the bare path without a siteId', () => {
    expect(scrubbedClaimPath('/claim', null)).toBe('/claim');
  });
});
