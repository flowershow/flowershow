// Safe email-based account linking for OAuth sign-ins.
//
// When someone signs in with a second OAuth provider (e.g. Google first, then
// GitHub) using the same email, NextAuth refuses by default
// (OAuthAccountNotLinked). We allow the link only when BOTH sides of the match
// are backed by a verified email:
//
//   1. the incoming provider asserts that it verified the email, and
//   2. the existing Flowershow user's email is itself trusted (verified via
//      magic link, a verified OAuth email, or a legacy Google sign-up).
//
// (1) stops an attacker who adds the victim's address, unverified, to their
// own GitHub/Google account from being logged into the victim's Flowershow
// account. (2) stops the reverse "pre-hijack": an attacker who created a
// Flowershow user with the victim's unverified email must not have the
// victim's real account linked into it later.
//
// Anything else falls back to a clear error telling the user which sign-in
// method they used originally.

export type GithubEmail = {
  email: string;
  primary: boolean;
  verified: boolean;
};

/**
 * Pick the email to use for a GitHub sign-in from `GET /user/emails`, and say
 * whether GitHub has verified it. Only verified addresses are returned as
 * verified: prefer the primary, then the public profile email, then any other.
 * If none is verified we fall back to the public profile email (GitHub only
 * lets users publish a verified address, but we don't rely on that) marked as
 * unverified, so it is never used for linking.
 */
export function pickGithubEmail(
  emails: GithubEmail[] | null | undefined,
  publicEmail: string | null | undefined,
): { email: string | null; verified: boolean } {
  const verified = (emails ?? []).filter((e) => e?.verified === true);
  const chosen =
    verified.find((e) => e.primary) ??
    (publicEmail ? verified.find((e) => e.email === publicEmail) : undefined) ??
    verified[0];
  if (chosen) return { email: chosen.email, verified: true };
  return { email: publicEmail ?? null, verified: false };
}

/** Whether the OAuth provider vouches that the user owns `profile.email`. */
export function isProviderEmailVerified(
  provider: string,
  profile: unknown,
): boolean {
  const p = profile as { email_verified?: unknown } | null | undefined;
  if (provider === 'google' || provider === 'github') {
    // Google: `email_verified` claim from the ID token / userinfo.
    // GitHub: set by our userinfo request from GET /user/emails.
    return p?.email_verified === true;
  }
  return false;
}

export type ExistingUserForLinking = {
  emailVerified: Date | null;
  accounts: { provider: string }[];
};

/**
 * Whether the existing user's email can be trusted as belonging to them.
 * `emailVerified` is set by magic-link sign-in and (from now on) by sign-ups
 * through a verified OAuth email. Legacy Google sign-ups predate that, but
 * Google only issues email claims for addresses the account controls.
 */
export function isExistingUserEmailTrusted(user: ExistingUserForLinking) {
  return (
    user.emailVerified != null ||
    user.accounts.some((a) => a.provider === 'google')
  );
}

export function canAutoLinkByEmail(args: {
  provider: string;
  profile: unknown;
  existingUser: ExistingUserForLinking;
}): boolean {
  return (
    isProviderEmailVerified(args.provider, args.profile) &&
    isExistingUserEmailTrusted(args.existingUser)
  );
}

const PROVIDER_LABELS: Record<string, string> = {
  github: 'GitHub',
  google: 'Google',
  email: 'an email sign-in link',
};

/** The sign-in method to suggest when we refuse to link. */
export function originalSignInMethod(user: ExistingUserForLinking): string {
  return user.accounts[0]?.provider ?? 'email';
}

export function accountNotLinkedMessage(method?: string | null): string {
  const label = method ? PROVIDER_LABELS[method] : undefined;
  if (label) {
    return `This email is already registered with Flowershow. Please sign in with ${label}, the method you used originally.`;
  }
  return 'This email is already registered with Flowershow using a different sign-in method. Please sign in the way you did originally.';
}

// NextAuth v4 fires `events.createUser` and reports `isNewUser: true` even when
// it links a new provider to an EXISTING user by email. A user row created in
// this request is seconds old; a linked one is not.
const FRESH_USER_WINDOW_MS = 60 * 1000;

export function isFreshlyCreatedUser(
  user: { createdAt?: Date | string | null },
  now: number = Date.now(),
): boolean {
  if (!user.createdAt) return true; // unknown: preserve previous behaviour
  return now - new Date(user.createdAt).getTime() < FRESH_USER_WINDOW_MS;
}
