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

async function registerClient(page: Page) {
  const res = await page.request.post(`${HOME}/oauth/register`, {
    data: { client_name: 'E2E MCP client', redirect_uris: [REDIRECT] },
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
});
