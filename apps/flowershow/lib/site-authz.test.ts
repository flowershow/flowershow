import { describe, expect, it } from 'vitest';
import {
  canManageSite,
  isSiteOwner,
  siteAuthzSelect,
  siteRole,
} from './site-authz';

const site = (plan: 'FREE' | 'PREMIUM', memberIds: string[] = []) => ({
  userId: 'owner-1',
  plan,
  members: memberIds.map((userId) => ({ userId })),
});

describe('siteRole', () => {
  it.each([
    ['owner on FREE', 'owner-1', site('FREE'), 'owner'],
    ['owner on PREMIUM', 'owner-1', site('PREMIUM', ['ed-1']), 'owner'],
    ['editor on PREMIUM', 'ed-1', site('PREMIUM', ['ed-1']), 'editor'],
    [
      'editor on FREE (lapsed)',
      'ed-1',
      site('FREE', ['ed-1']),
      'lapsed_editor',
    ],
    ['removed editor', 'ed-1', site('PREMIUM'), null],
    ['stranger', 'x', site('PREMIUM'), null],
  ] as const)('%s', (_l, userId, s, expected) => {
    expect(siteRole(userId, s)).toBe(expected);
  });
  it('returns null for a missing user or site', () => {
    expect(siteRole(undefined, site('PREMIUM'))).toBeNull();
    expect(siteRole(null, site('PREMIUM'))).toBeNull();
    expect(siteRole('owner-1', null)).toBeNull();
    expect(siteRole('owner-1', undefined)).toBeNull();
  });
});

describe('canManageSite', () => {
  it('allows the owner on any plan and an editor on PREMIUM', () => {
    expect(canManageSite('owner-1', site('FREE'))).toBe(true);
    expect(canManageSite('ed-1', site('PREMIUM', ['ed-1']))).toBe(true);
  });
  it('denies an editor on a FREE site', () => {
    expect(canManageSite('ed-1', site('FREE', ['ed-1']))).toBe(false);
  });
  it('denies a removed editor', () => {
    expect(canManageSite('ed-1', site('PREMIUM'))).toBe(false);
  });
  it('denies a stranger on a site that has other editors', () => {
    expect(canManageSite('x', site('PREMIUM', ['ed-1', 'ed-2']))).toBe(false);
  });
  it('denies missing user or site', () => {
    expect(canManageSite(undefined, site('PREMIUM'))).toBe(false);
    expect(canManageSite(null, site('PREMIUM'))).toBe(false);
    expect(
      canManageSite('', {
        userId: '',
        plan: 'PREMIUM',
        members: [{ userId: '' }],
      }),
    ).toBe(false);
    expect(canManageSite('owner-1', null)).toBe(false);
    expect(canManageSite('owner-1', undefined)).toBe(false);
  });
});

describe('isSiteOwner', () => {
  it('allows the owner and denies others', () => {
    expect(isSiteOwner('owner-1', site('FREE'))).toBe(true);
    expect(isSiteOwner('someone-else', site('FREE'))).toBe(false);
  });
  it('is false for an editor, even on PREMIUM', () => {
    expect(isSiteOwner('ed-1', site('PREMIUM', ['ed-1']))).toBe(false);
  });
  it('denies missing user or site', () => {
    expect(isSiteOwner(undefined, site('FREE'))).toBe(false);
    expect(isSiteOwner('', { userId: '' })).toBe(false);
    expect(isSiteOwner('owner-1', null)).toBe(false);
  });
});

describe('siteAuthzSelect', () => {
  it("loads plan and only the caller's membership row", () => {
    expect(siteAuthzSelect('u1')).toEqual({
      userId: true,
      plan: true,
      members: { where: { userId: 'u1' }, select: { userId: true } },
    });
  });
});
