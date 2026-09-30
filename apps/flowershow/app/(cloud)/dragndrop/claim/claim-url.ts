/** Callback URL (on the home domain) that returns the user to /claim after login, preserving siteId and link token. */
export function buildClaimCallbackUrl({
  protocol,
  homeDomain,
  siteId,
  token,
}: {
  protocol: string;
  homeDomain: string;
  siteId: string | null;
  token: string | null;
}): string {
  const params = new URLSearchParams();
  if (siteId) params.set('siteId', siteId);
  if (token) params.set('token', token);
  const qs = params.toString();
  return `${protocol}://${homeDomain}/claim${qs ? `?${qs}` : ''}`;
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
