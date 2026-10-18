import { describe, expect, it } from 'vitest';
import {
  ANON_BANNER_ID,
  ANON_HTML_CSP,
  injectAnonBanner,
  isAnonymousSite,
  isAnonymousUsername,
  rawHtmlSafetyHeaders,
  reportAbuseUrl,
} from './anon-site-safety';
import { ANONYMOUS_USER_ID } from './anonymous-user-constants';

describe('rawHtmlSafetyHeaders', () => {
  it('sandboxes raw HTML on an anonymous site', () => {
    expect(rawHtmlSafetyHeaders({ userId: ANONYMOUS_USER_ID })).toEqual({
      'Content-Security-Policy': ANON_HTML_CSP,
    });
  });

  it('adds nothing for a claimed site', () => {
    expect(rawHtmlSafetyHeaders({ userId: 'user-123' })).toEqual({});
  });

  it('blocks forms, same-origin and top navigation', () => {
    const tokens = ANON_HTML_CSP.split(/\s+/);
    expect(tokens[0]).toBe('sandbox');
    expect(tokens).toContain('allow-scripts');
    for (const t of [
      'allow-forms',
      'allow-same-origin',
      'allow-top-navigation',
      'allow-top-navigation-by-user-activation',
      'allow-popups-to-escape-sandbox',
      'allow-modals',
      'allow-downloads',
    ]) {
      expect(tokens).not.toContain(t);
    }
  });
});

describe('isAnonymousSite / isAnonymousUsername', () => {
  it('is true only for the anonymous user', () => {
    expect(isAnonymousSite({ userId: ANONYMOUS_USER_ID })).toBe(true);
    expect(isAnonymousSite({ userId: 'user-123' })).toBe(false);
    expect(isAnonymousUsername('anon')).toBe(true);
    expect(isAnonymousUsername('alice')).toBe(false);
    expect(isAnonymousUsername(undefined)).toBe(false);
  });
});

describe('injectAnonBanner', () => {
  const url = 'https://x-anon.test.localhost/index.html';

  it('inserts the banner before </body>', () => {
    const out = injectAnonBanner('<html><body><p>hi</p></BODY></html>', url);
    expect(out).toMatch(
      new RegExp(
        `<p>hi</p><div id="${ANON_BANNER_ID}"[^]*</div></BODY></html>$`,
      ),
    );
    expect(out).toContain('Published anonymously with');
    expect(out).toContain('Report abuse');
  });

  it('appends when there is no </body>', () => {
    const out = injectAnonBanner('<h1>bare</h1>', url);
    expect(out.startsWith('<h1>bare</h1><div id=')).toBe(true);
  });

  it('links to the report form with the page URL, attribute-escaped', () => {
    const out = injectAnonBanner('', 'https://a.test.localhost/"x"');
    expect(out).toContain(
      `href="${reportAbuseUrl('https://a.test.localhost/"x"').replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"`,
    );
    expect(out).not.toContain('/"x"');
  });
});

describe('reportAbuseUrl', () => {
  it('points at the home domain with the url prefilled', () => {
    const u = new URL(reportAbuseUrl('https://x-anon.test.localhost/a b'));
    expect(u.host).toBe('test.localhost');
    expect(u.pathname).toBe('/report-abuse');
    expect(u.searchParams.get('url')).toBe('https://x-anon.test.localhost/a b');
  });
});
