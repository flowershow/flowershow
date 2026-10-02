/**
 * siteId and claim token from a claim link. The token lives in the fragment
 * (`/claim?siteId=…#token=…`) so it never reaches servers or logs; a token in
 * the query (older links) is still accepted.
 */
export function parseClaimLink({
  search,
  hash,
}: {
  search: string;
  hash: string;
}): { siteId: string | null; token: string | null } {
  const query = new URLSearchParams(search);
  const fragment = new URLSearchParams(hash.replace(/^#/, ''));
  return {
    siteId: query.get('siteId'),
    token: fragment.get('token') ?? query.get('token'),
  };
}

type TokenStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const stashKey = (siteId: string) => `flowershow_claim_token:${siteId}`;
// Long enough to finish signing up; the token itself lives until the site expires.
const STASH_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Keep the claim token in (same-origin) storage while the user logs in, so it
 * doesn't have to travel in the login callbackUrl. Storage may be unavailable
 * (private mode, blocked): then the user just opens the link again.
 */
export function stashClaimToken(
  storage: TokenStorage | null,
  siteId: string,
  token: string,
  now: number = Date.now(),
): void {
  try {
    storage?.setItem(stashKey(siteId), JSON.stringify({ token, savedAt: now }));
  } catch {}
}

export function readStashedClaimToken(
  storage: TokenStorage | null,
  siteId: string,
  now: number = Date.now(),
): string | null {
  try {
    const raw = storage?.getItem(stashKey(siteId));
    if (!raw) return null;
    const { token, savedAt } = JSON.parse(raw);
    if (typeof token !== 'string' || !(now - savedAt < STASH_TTL_MS)) {
      storage?.removeItem(stashKey(siteId));
      return null;
    }
    return token;
  } catch {
    return null;
  }
}

export function clearStashedClaimToken(
  storage: TokenStorage | null,
  siteId: string,
): void {
  try {
    storage?.removeItem(stashKey(siteId));
  } catch {}
}

/** Callback URL (on the home domain) that returns the user to /claim after login. Carries the siteId only, never the token. */
export function buildClaimCallbackUrl({
  protocol,
  homeDomain,
  siteId,
}: {
  protocol: string;
  homeDomain: string;
  siteId: string | null;
}): string {
  const qs = siteId ? `?${new URLSearchParams({ siteId })}` : '';
  return `${protocol}://${homeDomain}/claim${qs}`;
}

/** Login URL on the cloud domain that redirects back to `callbackUrl`. */
export function buildClaimLoginUrl({
  protocol,
  cloudDomain,
  callbackUrl,
}: {
  protocol: string;
  cloudDomain: string;
  callbackUrl: string;
}): string {
  return `${protocol}://${cloudDomain}/login?callbackUrl=${encodeURIComponent(callbackUrl)}`;
}
