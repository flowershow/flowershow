import { describe, expect, it, vi } from 'vitest';

vi.mock('@/env.mjs', () => ({
  env: {
    ANONYMOUS_JWT_SECRET: 'test-secret',
    NEXT_PUBLIC_HOME_DOMAIN: 'flowershow.app',
    NEXT_PUBLIC_VERCEL_ENV: 'production',
  },
}));

import {
  buildClaimUrl,
  CLAIM_TOKEN_PREFIX,
  generateOwnershipToken,
  generateSiteClaimToken,
  verifySiteClaimToken,
} from './anonymous-user';

const ANON = '3f1c2b7a-1d2e-4f3a-9b4c-5d6e7f8a9b0c';

describe('site claim tokens', () => {
  it('round-trips siteId and anonymousUserId', () => {
    const token = generateSiteClaimToken('site-1', ANON);
    expect(token.startsWith(CLAIM_TOKEN_PREFIX)).toBe(true);
    expect(verifySiteClaimToken(token)).toEqual({
      siteId: 'site-1',
      anonymousUserId: ANON,
    });
  });

  it('rejects a browser ownership token (different type)', () => {
    const ownership = generateOwnershipToken(ANON);
    expect(
      verifySiteClaimToken(`${CLAIM_TOKEN_PREFIX}${ownership}`),
    ).toBeNull();
    expect(verifySiteClaimToken(ownership)).toBeNull();
  });

  it('rejects a tampered token', () => {
    const token = generateSiteClaimToken('site-1', ANON);
    expect(verifySiteClaimToken(token.slice(0, -2) + 'xx')).toBeNull();
  });

  it('builds an https claim URL with the token encoded', () => {
    const url = buildClaimUrl('site-1', 'fs_claim_a.b.c');
    expect(url).toBe(
      'https://flowershow.app/claim?siteId=site-1&token=fs_claim_a.b.c',
    );
  });
});
