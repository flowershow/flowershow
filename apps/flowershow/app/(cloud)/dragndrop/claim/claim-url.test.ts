import { describe, expect, it } from 'vitest';
import { buildClaimCallbackUrl, buildClaimLoginUrl } from './claim-url';

const base = { protocol: 'https', homeDomain: 'flowershow.app' };

describe('buildClaimCallbackUrl', () => {
  it('preserves siteId and token', () => {
    const url = buildClaimCallbackUrl({
      ...base,
      siteId: 's1',
      token: 'fs_claim_a.b-c',
    });
    expect(url).toBe(
      'https://flowershow.app/claim?siteId=s1&token=fs_claim_a.b-c',
    );
  });

  it('URL-encodes the token', () => {
    const url = buildClaimCallbackUrl({
      ...base,
      siteId: 's1',
      token: 'a b&c=d',
    });
    expect(new URL(url).searchParams.get('token')).toBe('a b&c=d');
    expect(url).not.toContain('a b&c=d');
  });

  it('works without token (legacy) and without siteId', () => {
    expect(buildClaimCallbackUrl({ ...base, siteId: 's1', token: null })).toBe(
      'https://flowershow.app/claim?siteId=s1',
    );
    expect(buildClaimCallbackUrl({ ...base, siteId: null, token: null })).toBe(
      'https://flowershow.app/claim',
    );
  });
});

describe('buildClaimLoginUrl', () => {
  it('keeps the token intact through the callbackUrl param', () => {
    const token = 'fs_claim_eyJ0.e+/x=.sig&x';
    const callbackUrl = buildClaimCallbackUrl({ ...base, siteId: 's1', token });
    const login = buildClaimLoginUrl({
      protocol: 'https',
      cloudDomain: 'cloud.flowershow.app',
      callbackUrl,
    });
    const parsed = new URL(login);
    expect(parsed.origin).toBe('https://cloud.flowershow.app');
    expect(parsed.pathname).toBe('/login');
    const cb = parsed.searchParams.get('callbackUrl');
    expect(cb).toBe(callbackUrl);
    expect(new URL(cb as string).searchParams.get('token')).toBe(token);
    expect(new URL(cb as string).searchParams.get('siteId')).toBe('s1');
  });
});
