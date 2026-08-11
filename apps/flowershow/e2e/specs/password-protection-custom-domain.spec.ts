import { expect, test } from '../helpers/fixtures';
import {
  PASSWORD_CUSTOM_DOMAIN_SITE_BASE_URL,
  PASSWORD_CUSTOM_DOMAIN_SITE_CUSTOM_DOMAIN,
} from '../helpers/seed';

// Regression tests for the custom-domain login redirect loop fixed in 04b2128c.
//
// A password-protected site that ALSO has a custom domain used to bounce between
// the custom domain and the subdomain until the browser gave up with
// ERR_TOO_MANY_REDIRECTS. The cause: the middleware's canonical-host helper
// (getSiteUrl) fell back to the subdomain while getSite / the site-access cookie
// treated the custom domain as canonical, so the login redirect never settled on
// one host. The fix makes the custom domain canonical whenever one is set.
//
// If the loop regresses, `page.goto` below throws ERR_TOO_MANY_REDIRECTS and the
// test fails; on success the visitor lands on a single `/_login` on ONE host.
//
// This project's baseURL is the custom domain, so bare paths hit the custom
// domain; the subdomain is targeted via its absolute URL.
test.describe('Password-protected site with a custom domain', () => {
  test('custom domain redirects to login on the same host without looping', async ({
    page,
  }) => {
    await page.goto('/');

    const url = new URL(page.url());
    expect(url.host).toBe(PASSWORD_CUSTOM_DOMAIN_SITE_CUSTOM_DOMAIN);
    expect(url.pathname).toBe('/_login');
    await expect(page.locator('body')).toBeVisible();
  });

  test('subdomain redirects to the custom-domain login without looping', async ({
    page,
  }) => {
    await page.goto(`${PASSWORD_CUSTOM_DOMAIN_SITE_BASE_URL}/`);

    // The custom domain is canonical, so the login must settle there — not
    // bounce back to the subdomain.
    const url = new URL(page.url());
    expect(url.host).toBe(PASSWORD_CUSTOM_DOMAIN_SITE_CUSTOM_DOMAIN);
    expect(url.pathname).toBe('/_login');
    await expect(page.locator('body')).toBeVisible();
  });

  test('non-image raw file on the custom domain redirects to login without looping', async ({
    page,
  }) => {
    await page.goto('/basic-syntax.md');

    const url = new URL(page.url());
    expect(url.host).toBe(PASSWORD_CUSTOM_DOMAIN_SITE_CUSTOM_DOMAIN);
    expect(url.pathname).toBe('/_login');
  });
});
