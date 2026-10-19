import { describe, expect, it } from 'vitest';
import {
  accountNotLinkedMessage,
  canAutoLinkByEmail,
  isFreshlyCreatedUser,
  isProviderEmailVerified,
  originalSignInMethod,
  pickGithubEmail,
} from './account-linking';

describe('pickGithubEmail', () => {
  it('prefers the verified primary email', () => {
    expect(
      pickGithubEmail(
        [
          { email: 'other@x.com', primary: false, verified: true },
          { email: 'me@x.com', primary: true, verified: true },
        ],
        'other@x.com',
      ),
    ).toEqual({ email: 'me@x.com', verified: true });
  });

  it('never returns an unverified primary as verified', () => {
    expect(
      pickGithubEmail(
        [
          { email: 'victim@x.com', primary: true, verified: false },
          { email: 'mine@x.com', primary: false, verified: true },
        ],
        null,
      ),
    ).toEqual({ email: 'mine@x.com', verified: true });
  });

  it('marks the result unverified when no address is verified', () => {
    expect(
      pickGithubEmail(
        [{ email: 'victim@x.com', primary: true, verified: false }],
        null,
      ),
    ).toEqual({ email: null, verified: false });
    expect(pickGithubEmail(null, 'public@x.com')).toEqual({
      email: 'public@x.com',
      verified: false,
    });
  });
});

describe('isProviderEmailVerified', () => {
  it('requires email_verified === true', () => {
    expect(isProviderEmailVerified('google', { email_verified: true })).toBe(
      true,
    );
    expect(isProviderEmailVerified('google', { email_verified: false })).toBe(
      false,
    );
    expect(isProviderEmailVerified('google', {})).toBe(false);
    expect(isProviderEmailVerified('github', { email_verified: 'true' })).toBe(
      false,
    );
    expect(isProviderEmailVerified('other', { email_verified: true })).toBe(
      false,
    );
  });
});

describe('canAutoLinkByEmail', () => {
  const verified = { email_verified: true };
  const unverified = { email_verified: false };

  it('links Google-first user when GitHub email is verified', () => {
    expect(
      canAutoLinkByEmail({
        provider: 'github',
        profile: verified,
        existingUser: {
          emailVerified: null,
          accounts: [{ provider: 'google' }],
        },
      }),
    ).toBe(true);
  });

  it('links magic-link user (emailVerified set) to a verified OAuth email', () => {
    expect(
      canAutoLinkByEmail({
        provider: 'google',
        profile: verified,
        existingUser: { emailVerified: new Date(), accounts: [] },
      }),
    ).toBe(true);
  });

  it('refuses when the incoming email is unverified (takeover)', () => {
    expect(
      canAutoLinkByEmail({
        provider: 'github',
        profile: unverified,
        existingUser: { emailVerified: new Date(), accounts: [] },
      }),
    ).toBe(false);
  });

  it('refuses when the existing user email is untrusted (pre-hijack)', () => {
    expect(
      canAutoLinkByEmail({
        provider: 'google',
        profile: verified,
        existingUser: {
          emailVerified: null,
          accounts: [{ provider: 'github' }],
        },
      }),
    ).toBe(false);
  });
});

describe('originalSignInMethod / accountNotLinkedMessage', () => {
  it('names the original provider', () => {
    expect(
      originalSignInMethod({
        emailVerified: null,
        accounts: [{ provider: 'google' }],
      }),
    ).toBe('google');
    expect(
      originalSignInMethod({ emailVerified: new Date(), accounts: [] }),
    ).toBe('email');
    expect(accountNotLinkedMessage('google')).toContain('sign in with Google');
    expect(accountNotLinkedMessage('email')).toContain('email sign-in link');
    expect(accountNotLinkedMessage('<script>')).not.toContain('<script>');
    expect(accountNotLinkedMessage(null)).toContain('different sign-in method');
  });
});

describe('isFreshlyCreatedUser', () => {
  it('distinguishes a just-created user from an existing (linked) one', () => {
    const now = Date.now();
    expect(isFreshlyCreatedUser({ createdAt: new Date(now - 1000) }, now)).toBe(
      true,
    );
    expect(
      isFreshlyCreatedUser({ createdAt: new Date(now - 86_400_000) }, now),
    ).toBe(false);
  });
});
