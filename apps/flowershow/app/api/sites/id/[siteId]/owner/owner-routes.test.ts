// @vitest-environment node
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next-auth', () => ({ getServerSession: vi.fn() }));
vi.mock('@/server/auth', () => ({ authOptions: {} }));
vi.mock('@/server/db', () => ({
  default: { site: { findUnique: vi.fn() } },
}));
vi.mock('@/lib/site-owner-code', () => ({
  createOwnerCode: vi.fn(),
  consumeOwnerCode: vi.fn(),
}));

import { getServerSession } from 'next-auth';
import { consumeOwnerCode, createOwnerCode } from '@/lib/site-owner-code';
import { ownerCookieName, signOwnerToken } from '@/lib/site-owner-session';
import prisma from '@/server/db';
import { GET as authorize } from './authorize/route';
import { GET as callback } from './callback/route';
import { GET as me } from './me/route';
import { POST as signout } from './signout/route';

const session = getServerSession as ReturnType<typeof vi.fn>;
const siteFind = prisma.site.findUnique as ReturnType<typeof vi.fn>;
const createCode = createOwnerCode as ReturnType<typeof vi.fn>;
const consumeCode = consumeOwnerCode as ReturnType<typeof vi.fn>;

const CLOUD = 'cloud.test.localhost';
const SITE_HOST = 'notes-alice.test.localhost';
const SITE = {
  id: 'site-1',
  userId: 'owner-1',
  subdomain: 'notes-alice',
  customDomain: null as string | null,
};
const params = (siteId = 'site-1') => ({
  params: Promise.resolve({ siteId }),
});
const get = (host: string, path: string, cookie?: string) =>
  new NextRequest(`http://${host}${path}`, {
    headers: { host, ...(cookie ? { cookie } : {}) },
  });

beforeEach(() => {
  vi.clearAllMocks();
  siteFind.mockResolvedValue(SITE);
  session.mockResolvedValue({ user: { id: 'owner-1' } });
  createCode.mockResolvedValue('the-code');
  consumeCode.mockResolvedValue('owner-1');
});

describe('GET owner/authorize (cloud)', () => {
  const path = '/api/sites/id/site-1/owner/authorize?return=%2Fnotes%2Fdraft';

  it('sends the owner back to the site host with a one-time code', async () => {
    const res = await authorize(get(CLOUD, path), params());
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe(
      `http://${SITE_HOST}/_flowershow/owner/callback?code=the-code&return=%2Fnotes%2Fdraft`,
    );
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(createCode).toHaveBeenCalledWith('site-1', 'owner-1');
  });

  it('uses the custom domain when the site has one', async () => {
    siteFind.mockResolvedValue({ ...SITE, customDomain: 'notes.example.com' });
    const res = await authorize(get(CLOUD, path), params());
    expect(res.headers.get('location')).toMatch(
      /^http:\/\/notes\.example\.com\/_flowershow\/owner\/callback\?/,
    );
  });

  it('sends a signed-out user to login and back here', async () => {
    session.mockResolvedValue(null);
    const res = await authorize(get(CLOUD, path), params());
    expect(res.status).toBe(302);
    const location = new URL(res.headers.get('location')!);
    expect(location.host).toBe(CLOUD);
    expect(location.pathname).toBe('/login');
    expect(location.searchParams.get('callbackUrl')).toBe(path);
    expect(createCode).not.toHaveBeenCalled();
  });

  it('refuses a signed-in user who does not own the site (non-owner)', async () => {
    session.mockResolvedValue({ user: { id: 'mallory' } });
    const res = await authorize(get(CLOUD, path), params());
    expect(res.status).toBe(403);
    expect(createCode).not.toHaveBeenCalled();
  });

  it('gives the same answer for a site that does not exist', async () => {
    siteFind.mockResolvedValue(null);
    const res = await authorize(get(CLOUD, path), params());
    expect(res.status).toBe(403);
  });

  it.each(['https://evil.com', '//evil.com', '/\\evil.com'])(
    'never forwards an absolute return (%s)',
    async (evil) => {
      const res = await authorize(
        get(
          CLOUD,
          `/api/sites/id/site-1/owner/authorize?return=${encodeURIComponent(evil)}`,
        ),
        params(),
      );
      const location = new URL(res.headers.get('location')!);
      expect(location.host).toBe(SITE_HOST);
      expect(location.searchParams.get('return')).toBe('/');
    },
  );

  it('moves to the cloud host when called on another host', async () => {
    const res = await authorize(get(SITE_HOST, path), params());
    expect(new URL(res.headers.get('location')!).host).toBe(CLOUD);
    expect(session).not.toHaveBeenCalled();
    expect(createCode).not.toHaveBeenCalled();
  });
});

describe('GET owner/callback (site host)', () => {
  const path = '/_flowershow/owner/callback?code=the-code&return=%2Fnotes';

  it('sets a host-only, HttpOnly owner cookie and returns to the page', async () => {
    const res = await callback(get(SITE_HOST, path), params());
    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toBe('/notes');
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(res.headers.get('referrer-policy')).toBe('no-referrer');
    const cookie = res.headers.get('set-cookie')!;
    expect(cookie).toMatch(new RegExp(`^${ownerCookieName()}=`));
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain('Path=/');
    expect(cookie).toContain(`Max-Age=${7 * 24 * 3600}`);
    expect(cookie).not.toMatch(/domain=/i);
    expect(consumeCode).toHaveBeenCalledWith('the-code', 'site-1');
  });

  it('rejects an expired, used or wrong-site code', async () => {
    consumeCode.mockResolvedValue(null);
    const res = await callback(get(SITE_HOST, path), params());
    expect(res.status).toBe(400);
    expect(res.headers.get('set-cookie')).toBeNull();
  });

  it('rejects a code for a user who no longer owns the site', async () => {
    consumeCode.mockResolvedValue('former-owner');
    const res = await callback(get(SITE_HOST, path), params());
    expect(res.status).toBe(400);
    expect(res.headers.get('set-cookie')).toBeNull();
  });

  it("refuses to set the cookie on a host that isn't the site's own", async () => {
    const res = await callback(get('evil-bob.test.localhost', path), params());
    expect(res.status).toBe(400);
    expect(res.headers.get('set-cookie')).toBeNull();
    expect(consumeCode).not.toHaveBeenCalled();
  });

  it.each(['https://evil.com', '//evil.com', '/\\evil.com'])(
    'never redirects off the site (%s)',
    async (evil) => {
      const res = await callback(
        get(
          SITE_HOST,
          `/_flowershow/owner/callback?code=c&return=${encodeURIComponent(evil)}`,
        ),
        params(),
      );
      expect(res.headers.get('location')).toBe('/');
    },
  );
});

describe('GET owner/me', () => {
  const cookieFor = async (
    userId: string,
    siteId = 'site-1',
    host = SITE_HOST,
  ) => `${ownerCookieName()}=${await signOwnerToken({ siteId, userId, host })}`;

  it('is false for an anonymous visitor, and never cached', async () => {
    const res = await me(get(SITE_HOST, '/_flowershow/owner/me'), params());
    expect(await res.json()).toEqual({ isOwner: false });
    expect(res.headers.get('cache-control')).toBe('private, no-store');
  });

  it('is true with a valid owner cookie', async () => {
    const res = await me(
      get(SITE_HOST, '/_flowershow/owner/me', await cookieFor('owner-1')),
      params(),
    );
    expect(await res.json()).toEqual({ isOwner: true });
  });

  it('is false for a cookie minted for another site', async () => {
    const res = await me(
      get(
        SITE_HOST,
        '/_flowershow/owner/me',
        await cookieFor('owner-1', 'site-2'),
      ),
      params(),
    );
    expect(await res.json()).toEqual({ isOwner: false });
  });

  it('is false for a forged cookie value', async () => {
    const res = await me(
      get(
        SITE_HOST,
        '/_flowershow/owner/me',
        `${ownerCookieName()}=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJvd25lci0xIn0.forged`,
      ),
      params(),
    );
    expect(await res.json()).toEqual({ isOwner: false });
  });

  it('is false once the site has a different owner', async () => {
    siteFind.mockResolvedValue({ ...SITE, userId: 'new-owner' });
    const res = await me(
      get(SITE_HOST, '/_flowershow/owner/me', await cookieFor('owner-1')),
      params(),
    );
    expect(await res.json()).toEqual({ isOwner: false });
  });
});

describe('POST owner/signout', () => {
  it('clears the cookie', async () => {
    const res = await signout();
    const cookie = res.headers.get('set-cookie')!;
    expect(cookie).toMatch(new RegExp(`^${ownerCookieName()}=;`));
    expect(cookie).toMatch(/Max-Age=0/i);
  });
});
