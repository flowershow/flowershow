import { describe, expect, it } from 'vitest';
import { decideClaimAction, scrubbedClaimPath } from './claim-flow';

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

  it('reports missing information', () => {
    expect(decideClaimAction({ ...base, status: 'authenticated' })).toBe(
      'missing',
    );
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
