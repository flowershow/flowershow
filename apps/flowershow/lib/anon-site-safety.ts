import { env } from '@/env.mjs';
import { ANONYMOUS_USER_ID } from './anonymous-user-constants';

/**
 * Abuse controls for anonymous (unclaimed) sites (flowershow-ctv).
 *
 * Anonymous sites live on *.flowershow.me next to every customer site, and
 * flowershow.me is not (yet) on the Public Suffix List, so one phishing page
 * flagged by Safe Browsing can taint all of them. Claimed sites (owned by a
 * real user) are never affected by anything here.
 */

/**
 * CSP for raw .html served from an anonymous site.
 *
 * `sandbox` with only:
 * - allow-scripts: HTML apps/demos (the main anon use case) keep working.
 * - allow-popups: `target="_blank"` links (incl. the "Report abuse" link)
 *   still open; popups inherit the sandbox (no allow-popups-to-escape-sandbox).
 *
 * Deliberately omitted:
 * - allow-forms: no credential-harvesting form can submit.
 * - allow-same-origin: the page runs in an opaque origin, so it cannot read or
 *   set `.flowershow.me` cookies (e.g. PostHog's cross-subdomain cookie) or
 *   use storage shared with other sites.
 * - allow-top-navigation(-by-user-activation): cannot navigate a framing page.
 * - allow-modals: no alert()/confirm() "your account is locked" lures.
 * - allow-downloads: no drive-by malware downloads.
 */
export const ANON_HTML_CSP = 'sandbox allow-scripts allow-popups';

/**
 * CSP for Markdown pages on anonymous sites. Raw HTML in Markdown is not
 * sanitised (rehype-raw), so a `<form action="https://evil…">` would render.
 * The page itself is our Next.js app, so it can't be sandboxed without breaking
 * hydration; blocking form submission is the targeted control. (Our own site
 * chrome uses JS-handled forms only, which are unaffected.)
 */
export const ANON_PAGE_CSP = "form-action 'none'";

/** A site is anonymous until claimed: claiming moves it to a real user. */
export function isAnonymousSite(site: { userId: string }): boolean {
  return site.userId === ANONYMOUS_USER_ID;
}

/** Extra response headers for a raw .html file (empty for claimed sites). */
export function rawHtmlSafetyHeaders(site: {
  userId: string;
}): Record<string, string> {
  return isAnonymousSite(site)
    ? { 'Content-Security-Policy': ANON_HTML_CSP }
    : {};
}

function homeOrigin(): string {
  const isSecure =
    env.NEXT_PUBLIC_VERCEL_ENV === 'production' ||
    env.NEXT_PUBLIC_VERCEL_ENV === 'preview';
  return `${isSecure ? 'https' : 'http'}://${env.NEXT_PUBLIC_HOME_DOMAIN}`;
}

/** Link to the abuse-report form, prefilled with the reported URL. */
export function reportAbuseUrl(reportedUrl: string): string {
  return `${homeOrigin()}/report-abuse?${new URLSearchParams({ url: reportedUrl })}`;
}

function escapeAttr(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export const ANON_BANNER_ID = 'flowershow-anon-banner';

/**
 * Small fixed notice injected into anonymous raw HTML at serve time. Plain
 * HTML + inline styles: it works under the sandbox CSP (which restricts
 * behaviour, not styles) and needs no script.
 */
export function anonHtmlBanner(reportedUrl: string): string {
  const link =
    'color:inherit;text-decoration:underline;font:inherit;background:none';
  return (
    `<div id="${ANON_BANNER_ID}" role="note" style="all:initial;position:fixed;left:8px;bottom:8px;z-index:2147483647;` +
    'background:rgba(17,17,17,.88);color:#fff;font:12px/1.4 system-ui,-apple-system,sans-serif;' +
    'padding:4px 10px;border-radius:999px;box-shadow:0 2px 8px rgba(0,0,0,.2)">' +
    `Published anonymously with <a href="${escapeAttr(homeOrigin())}" target="_blank" rel="noopener noreferrer" style="${link}">Flowershow</a>` +
    ` · <a href="${escapeAttr(reportAbuseUrl(reportedUrl))}" target="_blank" rel="noopener noreferrer" style="${link}">Report abuse</a>` +
    '</div>'
  );
}

/** Insert the banner before the last `</body>`, or append it (the parser puts it in body). */
export function injectAnonBanner(html: string, reportedUrl: string): string {
  const banner = anonHtmlBanner(reportedUrl);
  const idx = html.toLowerCase().lastIndexOf('</body>');
  if (idx === -1) return html + banner;
  return html.slice(0, idx) + banner + html.slice(idx);
}
