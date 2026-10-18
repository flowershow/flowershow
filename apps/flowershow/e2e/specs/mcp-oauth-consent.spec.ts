import { createHash, randomBytes } from 'node:crypto';
import type { BrowserContext, Page } from '@playwright/test';
import { encode } from 'next-auth/jwt';
import { expect, test } from '../helpers/fixtures';
import { TEST_USER } from '../helpers/seed';

// MCP OAuth consent (flowershow-3fr.2): authorize on the home domain, consent
// on the cloud host with the existing next-auth session, redirect back to the
// client with code + state + iss. Needs MCP_OAUTH_ENABLED=true on the server.

const HOME = `http://${process.env.NEXT_PUBLIC_HOME_DOMAIN || 'flowershow.local:3000'}`;
const CLOUD = `http://${process.env.NEXT_PUBLIC_CLOUD_DOMAIN || 'cloud.flowershow.local:3000'}`;
// A loopback redirect URI that nothing listens on: the test intercepts it.
const REDIRECT = 'http://127.0.0.1:47123/callback';

const verifier = randomBytes(32).toString('base64url');
const challenge = createHash('sha256').update(verifier).digest('base64url');

async function signIn(context: BrowserContext) {
  const token = await encode({
    token: {
      sub: TEST_USER.id,
      id: TEST_USER.id,
      name: TEST_USER.name,
      email: TEST_USER.email,
      username: TEST_USER.username,
      role: 'USER',
    },
    secret: process.env.NEXTAUTH_SECRET as string,
  });
  const cookieDomain = `.${new URL(CLOUD).hostname.split('.').slice(-2).join('.')}`;
  await context.addCookies([
    {
      name: 'next-auth.session-token',
      value: token,
      domain: cookieDomain,
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    },
  ]);
}

async function registerClient(page: Page, name = 'E2E MCP client') {
  const res = await page.request.post(`${HOME}/oauth/register`, {
    data: { client_name: name, redirect_uris: [REDIRECT] },
  });
  expect(res.status()).toBe(201);
  return (await res.json()).client_id as string;
}

function authorizeUrl(clientId: string, state: string) {
  const q = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: REDIRECT,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state,
    scope: 'sites:write',
    resource: `${HOME}/api/mcp/account`,
  });
  return `${HOME}/oauth/authorize?${q}`;
}

/** Capture the browser's arrival at the client's redirect URI. */
async function captureRedirect(page: Page) {
  let arrived: URL | null = null;
  await page.route(`${REDIRECT}**`, (route) => {
    arrived = new URL(route.request().url());
    return route.fulfill({
      status: 200,
      contentType: 'text/plain',
      body: 'ok',
    });
  });
  return () => arrived as URL | null;
}

test.describe('MCP OAuth consent', () => {
  test('signed-in user approves; redirect carries code, state and iss; code exchanges for tokens', async ({
    page,
    context,
  }) => {
    await signIn(context);
    const clientId = await registerClient(page);
    const arrived = await captureRedirect(page);

    await page.goto(authorizeUrl(clientId, 'state-allow'));
    await expect(page).toHaveURL(new RegExp(`^${CLOUD}/oauth/consent\\?req=`));
    await expect(page.getByTestId('oauth-client-name')).toHaveText(
      'E2E MCP client',
    );
    await expect(page.getByTestId('oauth-account')).toHaveText(
      `@${TEST_USER.username}`,
    );
    await expect(page.getByTestId('oauth-redirect-host')).toContainText(
      '127.0.0.1',
    );
    await expect(page.getByText('not verified by Flowershow')).toBeVisible();

    await page.getByTestId('oauth-allow').click();
    await expect
      .poll(() => arrived()?.searchParams.get('code') ?? null)
      .not.toBeNull();
    const url = arrived() as URL;
    expect(url.searchParams.get('state')).toBe('state-allow');
    expect(url.searchParams.get('iss')).toBe(HOME);

    const tokenRes = await page.request.post(`${HOME}/oauth/token`, {
      form: {
        grant_type: 'authorization_code',
        code: url.searchParams.get('code') as string,
        client_id: clientId,
        redirect_uri: REDIRECT,
        code_verifier: verifier,
      },
    });
    expect(tokenRes.status()).toBe(200);
    const tokens = await tokenRes.json();
    expect(tokens.access_token).toMatch(/^fs_oat_/);
    expect(tokens.refresh_token).toMatch(/^fs_ort_/);
  });

  test('cancel returns access_denied', async ({ page, context }) => {
    await signIn(context);
    const clientId = await registerClient(page);
    const arrived = await captureRedirect(page);

    await page.goto(authorizeUrl(clientId, 'state-deny'));
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect
      .poll(() => arrived()?.searchParams.get('error') ?? null)
      .toBe('access_denied');
    expect(arrived()?.searchParams.get('state')).toBe('state-deny');
    expect(arrived()?.searchParams.get('iss')).toBe(HOME);
  });

  test('a signed-out user goes through /login and comes back to consent', async ({
    page,
    context,
  }) => {
    const clientId = await registerClient(page);
    await page.goto(authorizeUrl(clientId, 'state-login'));
    await expect(page).toHaveURL(new RegExp(`^${CLOUD}/login\\?callbackUrl=`));
    const callbackUrl = new URL(page.url()).searchParams.get(
      'callbackUrl',
    ) as string;
    expect(callbackUrl).toMatch(/^\/oauth\/consent\?req=/);

    // Sign in (the session next-auth would set), then follow the callback.
    await signIn(context);
    await page.goto(`${CLOUD}${callbackUrl}`);
    await expect(page.getByTestId('oauth-client-name')).toHaveText(
      'E2E MCP client',
    );
  });

  test('the consent link only works in the browser that started sign-in (binding cookie)', async ({
    page,
    context,
    browser,
  }) => {
    await signIn(context);
    const clientId = await registerClient(page);
    await page.goto(authorizeUrl(clientId, 'state-bound'));
    await expect(page.getByTestId('oauth-allow')).toBeVisible();
    const consentUrl = page.url();

    // Same account, another browser (no binding cookie): refused.
    const other = await browser.newContext();
    try {
      await signIn(other);
      const otherPage = await other.newPage();
      await otherPage.goto(consentUrl);
      await expect(otherPage.getByTestId('oauth-other-browser')).toBeVisible();
      await expect(otherPage.getByTestId('oauth-allow')).toHaveCount(0);
    } finally {
      await other.close();
    }

    // The original browser can still decide it.
    const arrived = await captureRedirect(page);
    await page.reload();
    await page.getByTestId('oauth-allow').click();
    await expect
      .poll(() => arrived()?.searchParams.get('code') ?? null)
      .not.toBeNull();
  });

  test('a reconnect is approved by a POST from the page, never by the GET', async ({
    page,
    context,
  }) => {
    await signIn(context);
    const clientId = await registerClient(page);
    const arrived = await captureRedirect(page);

    // First connection: the user clicks Allow.
    await page.goto(authorizeUrl(clientId, 'state-first'));
    await page.getByTestId('oauth-allow').click();
    await expect
      .poll(() => arrived()?.searchParams.get('state') ?? null)
      .toBe('state-first');

    // Reconnect: start sign-in, but fetch the consent page without running
    // its JavaScript (a link scanner or prefetch would do this).
    const start = await page.request.get(authorizeUrl(clientId, 'state-re'), {
      maxRedirects: 0,
    });
    expect(start.status()).toBe(302);
    const consentUrl = start.headers().location as string;
    expect(consentUrl).toMatch(new RegExp(`^${CLOUD}/oauth/consent\\?req=`));
    const get = await page.request.get(consentUrl, { maxRedirects: 0 });
    expect(get.status()).toBe(200);
    expect(await get.text()).toContain('Reconnecting');

    // The GET consumed nothing: opening the page in the browser approves
    // (the form posts itself) and the client gets a code.
    await page.goto(consentUrl);
    await expect
      .poll(() => arrived()?.searchParams.get('state') ?? null)
      .toBe('state-re');
    expect(arrived()?.searchParams.get('code')).toBeTruthy();
  });

  test('Connected apps lists the app; Revoke disconnects it and its token stops working', async ({
    page,
    context,
  }) => {
    const name = `E2E revoke ${Date.now()}`;
    await signIn(context);
    const clientId = await registerClient(page, name);
    const arrived = await captureRedirect(page);
    await page.goto(authorizeUrl(clientId, 'state-revoke'));
    await page.getByTestId('oauth-allow').click();
    await expect
      .poll(() => arrived()?.searchParams.get('code') ?? null)
      .not.toBeNull();
    const tokenRes = await page.request.post(`${HOME}/oauth/token`, {
      form: {
        grant_type: 'authorization_code',
        code: arrived()?.searchParams.get('code') as string,
        client_id: clientId,
        redirect_uri: REDIRECT,
        code_verifier: verifier,
      },
    });
    const { access_token } = await tokenRes.json();
    const mcpCall = () =>
      page.request.post(`${HOME}/api/mcp/account`, {
        headers: {
          authorization: `Bearer ${access_token}`,
          accept: 'application/json, text/event-stream',
        },
        data: { jsonrpc: '2.0', id: 1, method: 'tools/list' },
      });
    expect((await mcpCall()).status()).not.toBe(401);

    await page.goto(`${CLOUD}/tokens`);
    const row = page.getByTestId('connected-app-row').filter({ hasText: name });
    await expect(row).toBeVisible();
    await expect(row).toContainText('sites:write');
    page.once('dialog', (dialog) => dialog.accept());
    await row.getByTestId('connected-app-revoke').click();
    await expect(row).toHaveCount(0);

    expect((await mcpCall()).status()).toBe(401);
  });
});
