export type ClaimAction =
  | 'wait'
  | 'login'
  | 'confirm'
  | 'auto-claim'
  | 'reopen-link'
  | 'missing';

/**
 * What the claim page should do. A token from the URL is never claimed
 * automatically: anyone can send a logged-in user a link, so the user must
 * confirm. The browser's own ownership token (drag-and-drop) is auto-claimed.
 */
export function decideClaimAction({
  status,
  siteId,
  linkToken,
  hasOwnershipToken,
}: {
  status: 'loading' | 'authenticated' | 'unauthenticated';
  siteId: string | null;
  linkToken: string | null;
  hasOwnershipToken: boolean;
}): ClaimAction {
  if (status === 'loading') return 'wait';
  if (status === 'unauthenticated') return 'login';
  if (!siteId) return 'missing';
  if (linkToken) return 'confirm';
  if (hasOwnershipToken) return 'auto-claim';
  // A siteId but no token: the token is kept in this browser's storage across
  // login, so login probably finished in another browser or device.
  return 'reopen-link';
}

/** The claim page path with the secret token removed (siteId kept). */
export function scrubbedClaimPath(
  pathname: string,
  siteId: string | null,
): string {
  if (!siteId) return pathname;
  return `${pathname}?${new URLSearchParams({ siteId }).toString()}`;
}
