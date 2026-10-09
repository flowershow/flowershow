import { expect, test } from '../helpers/fixtures';

// Server layouts must not forward incoming request data to the client tRPC
// provider: anything passed as a client-component prop ends up in the page HTML.

const PROBE_COOKIE = 'e2e-probe-cookie-7f3a';
const PROBE_HEADER = 'e2e-probe-header-7f3a';
const FORBIDDEN = [
  PROBE_COOKIE,
  PROBE_HEADER,
  'x-vercel-sc-headers',
  'x-vercel-oidc-token',
  'x-real-ip',
  'x-forwarded-for',
];

const CLOUD_DOMAIN =
  process.env.NEXT_PUBLIC_CLOUD_DOMAIN || 'cloud.flowershow.local:3000';

async function fetchHtml(
  request: import('@playwright/test').APIRequestContext,
  url: string,
) {
  const response = await request.get(url, {
    headers: {
      Cookie: `e2e_probe=${PROBE_COOKIE}`,
      'x-e2e-probe': PROBE_HEADER,
    },
  });
  expect(response.status()).toBeLessThan(500);
  return response.text();
}

test('site page HTML does not contain request headers', async ({
  request,
  basePath,
}) => {
  const html = await fetchHtml(request, `${basePath}/`);
  expect(html).toContain('self.__next_f');
  for (const needle of FORBIDDEN) {
    expect(html, needle).not.toContain(needle);
  }
});

test('dashboard page HTML does not contain request headers', async ({
  request,
}) => {
  const html = await fetchHtml(request, `http://${CLOUD_DOMAIN}/`);
  expect(html).toContain('self.__next_f');
  for (const needle of FORBIDDEN) {
    expect(html, needle).not.toContain(needle);
  }
});
