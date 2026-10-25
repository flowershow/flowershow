import { describe, expect, it } from 'vitest';
import { canManageSite, isSiteOwner } from './site-authz';

const site = { userId: 'owner-1' };

describe.each([
  ['isSiteOwner', isSiteOwner],
  ['canManageSite', canManageSite],
])('%s', (_name, fn) => {
  it('allows the owner', () => {
    expect(fn('owner-1', site)).toBe(true);
  });
  it('denies another user', () => {
    expect(fn('someone-else', site)).toBe(false);
  });
  it('denies a missing user', () => {
    expect(fn(undefined, site)).toBe(false);
    expect(fn(null, site)).toBe(false);
    expect(fn('', site)).toBe(false);
  });
  it('denies a missing site', () => {
    expect(fn('owner-1', null)).toBe(false);
    expect(fn('owner-1', undefined)).toBe(false);
  });
});
