import { type NextRequest, NextResponse } from 'next/server';
import { startAuthorization } from '@/lib/oauth/authorize';
import { disabledResponse } from '@/lib/oauth/http';
import { checkOAuthRateLimit } from '@/lib/oauth/rate-limit';

export const dynamic = 'force-dynamic';

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};
const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ESCAPES[c] as string);

/** Our own error page, for requests whose redirect URI can't be trusted. */
function errorPage(status: number, message: string) {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Sign-in request not valid · Flowershow</title><style>body{font-family:system-ui,sans-serif;max-width:32rem;margin:4rem auto;padding:0 1rem;color:#18181b;background:#fff}@media(prefers-color-scheme:dark){body{color:#f4f4f5;background:#09090b}}h1{font-size:1.25rem}</style></head><body><h1>This sign-in request isn't valid</h1><p>${escapeHtml(message)}</p><p>Go back to the app you came from and try connecting Flowershow again.</p></body></html>`;
  return new NextResponse(html, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'Content-Security-Policy':
        "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors 'none'",
      'X-Frame-Options': 'DENY',
    },
  });
}

/**
 * GET /oauth/authorize (RFC 6749 §4.1.1 + PKCE + RFC 8707), rewritten here
 * from the home domain. Validates the request, parks it as a pending request
 * and sends the browser to the consent page on the cloud host.
 */
export async function GET(request: NextRequest) {
  const disabled = disabledResponse();
  if (disabled) return disabled;
  if (!(await checkOAuthRateLimit('authorize', request.headers))) {
    return errorPage(
      429,
      'Too many sign-in requests. Wait a minute and try again.',
    );
  }
  const outcome = await startAuthorization(request.nextUrl.searchParams);
  if (outcome.kind === 'error_page')
    return errorPage(outcome.status, outcome.message);
  return NextResponse.redirect(outcome.location, {
    status: 302,
    headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' },
  });
}
