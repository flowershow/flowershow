/**
 * Where NextAuth may send the user after sign-in. Only our own first-party
 * hosts are allowed, not every *.flowershow.app subdomain: some of those
 * (e.g. r2.flowershow.app) serve user-uploaded content.
 */
export function resolveAuthRedirect({
  url,
  baseUrl,
  allowedHosts,
}: {
  url: string;
  baseUrl: string;
  allowedHosts: string[];
}): string {
  try {
    const redirectUrl = new URL(url, baseUrl);
    if (!['https:', 'http:'].includes(redirectUrl.protocol)) return baseUrl;
    if (redirectUrl.origin === new URL(baseUrl).origin) {
      return redirectUrl.href;
    }
    if (allowedHosts.includes(redirectUrl.host)) {
      return redirectUrl.href;
    }
    return baseUrl;
  } catch {
    return baseUrl;
  }
}
