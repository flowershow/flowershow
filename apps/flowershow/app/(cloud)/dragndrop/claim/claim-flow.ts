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

export type ClaimFailure = {
  /** What to tell the user (never the server's raw error text). */
  message: string;
  /** Show a "Try again" button: the same request may succeed later. */
  retryable: boolean;
  /** Forget the stashed claim token: the link can never work again. */
  clearStash: boolean;
};

/**
 * What to show after a failed claim request. `status` is the HTTP status, or
 * null if the request itself failed (offline, etc.); `code` is the response's
 * `code` field, if any.
 */
export function describeClaimFailure(
  status: number | null,
  code?: string | null,
): ClaimFailure {
  const final = (message: string): ClaimFailure => ({
    message,
    retryable: false,
    clearStash: true,
  });
  switch (status) {
    case 409:
      return final(
        'This site has already been added to a Flowershow account. If it was you, find it in your dashboard.',
      );
    case 410:
      return final(
        'This link has expired: sites published without an account are removed after 7 days. Publish again to get a new link.',
      );
    case 404:
      return final(
        "This site doesn't exist any more. It may have expired and been removed. Publish again to get a new link.",
      );
    case 400:
      return final(
        'This claim link is incomplete. Check that you copied the whole link.',
      );
    case 403:
      // Our own same-origin guard: the link is fine, the request wasn't.
      if (code === 'cross_origin') {
        return {
          message:
            'Your browser sent this request from another page. Reload this page and try again.',
          retryable: true,
          clearStash: false,
        };
      }
      return final(
        "This claim link isn't valid for this site. Check that you copied the whole link.",
      );
    case 401:
      return {
        message: 'Your login has expired. Log in again, then try again.',
        retryable: true,
        clearStash: false,
      };
    default:
      return {
        message: "Something went wrong and the site wasn't added. Try again.",
        retryable: true,
        clearStash: false,
      };
  }
}

/** "7 Oct 2026, 14:05" in the viewer's locale, or null. */
export function formatClaimExpiry(iso: string | null | undefined) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
