// @vitest-environment node
import { SignJWT } from 'jose';
import { describe, expect, it, vi } from 'vitest';
import { siteKeyBytes } from '@/lib/site-hmac-key';
import {
  getSiteManagerFromRequest,
  isSameOriginRequest,
  ownerCookieName,
  safeReturnPath,
  signOwnerToken,
  verifyOwnerToken,
} from './site-owner-session';

const SITE = { id: 'site-1', userId: 'owner-1' };
const HOST = 'notes-alice.test.localhost';

function requestWith(
  token: string | null,
  host = HOST,
  init: RequestInit = {},
) {
  const headers = new Headers(init.headers);
  headers.set('host', host);
  if (token) headers.set('cookie', `other=1; ${ownerCookieName()}=${token}`);
  return new Request(`http://${host}/x`, { ...init, headers });
}

describe('safeReturnPath (open-redirect guard)', () => {
  it.each([
    ['/notes/draft', '/notes/draft'],
    ['/notes/draft?x=1#h', '/notes/draft?x=1#h'],
    ['/a/../b', '/b'],
  ])('keeps the relative path %s', (raw, expected) => {
    expect(safeReturnPath(raw)).toBe(expected);
  });

  it.each([
    'https://evil.com',
    '//evil.com',
    '//evil.com/path',
    '/\\evil.com',
    '\\\\evil.com',
    '/\tevil.com',
    'javascript:alert(1)',
    'evil.com',
    ' /x',
    '/%0d%0aSet-Cookie:x',
    '',
    null,
    undefined,
    `/${'a'.repeat(3000)}`,
    '/_flowershow/owner/signin?return=/x',
  ])('rejects %s', (raw) => {
    const result = safeReturnPath(raw as string | null | undefined);
    // Whatever comes back must be a single-slash relative path on this host.
    expect(result.startsWith('/')).toBe(true);
    expect(result.startsWith('//')).toBe(false);
    expect(new URL(result, 'https://site.example').host).toBe('site.example');
    if (raw !== '/%0d%0aSet-Cookie:x') expect(result).toBe('/');
  });

  it('keeps encoded CRLF encoded (no header injection)', () => {
    expect(safeReturnPath('/%0d%0aSet-Cookie:x')).not.toMatch(/[\r\n]/);
  });
});

describe('owner token', () => {
  it('round-trips for the same site and host', async () => {
    const token = await signOwnerToken({
      siteId: 'site-1',
      userId: 'owner-1',
      host: HOST,
    });
    expect(
      await verifyOwnerToken(token, { siteId: 'site-1', host: HOST }),
    ).toBe('owner-1');
  });

  it('is rejected for another site (wrong site)', async () => {
    const token = await signOwnerToken({
      siteId: 'site-1',
      userId: 'owner-1',
      host: HOST,
    });
    expect(
      await verifyOwnerToken(token, { siteId: 'site-2', host: HOST }),
    ).toBeNull();
  });

  it('is rejected on another host', async () => {
    const token = await signOwnerToken({
      siteId: 'site-1',
      userId: 'owner-1',
      host: HOST,
    });
    expect(
      await verifyOwnerToken(token, {
        siteId: 'site-1',
        host: 'evil-bob.test.localhost',
      }),
    ).toBeNull();
  });

  it('rejects a forged token signed with another key', async () => {
    const forged = await new SignJWT({ host: HOST })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('owner-1')
      .setAudience('site-owner:site-1')
      .setExpirationTime('1h')
      .sign(new TextEncoder().encode('attacker-guess-secret-0123456789'));
    expect(
      await verifyOwnerToken(forged, { siteId: 'site-1', host: HOST }),
    ).toBeNull();
  });

  it('rejects the password-gate cookie (separate key and audience)', async () => {
    const accessToken = await new SignJWT({ sid: 'site-1', ver: 0 })
      .setProtectedHeader({ alg: 'HS256' })
      .setAudience('site-1')
      .setExpirationTime('1h')
      .sign(await siteKeyBytes('site-1', 0));
    expect(
      await verifyOwnerToken(accessToken, { siteId: 'site-1', host: HOST }),
    ).toBeNull();
  });

  it('rejects an unsigned (alg: none) token', async () => {
    const enc = (o: object) =>
      Buffer.from(JSON.stringify(o)).toString('base64url');
    const unsigned = `${enc({ alg: 'none' })}.${enc({
      sub: 'owner-1',
      aud: 'site-owner:site-1',
      host: HOST,
      exp: Math.floor(Date.now() / 1000) + 3600,
    })}.`;
    expect(
      await verifyOwnerToken(unsigned, { siteId: 'site-1', host: HOST }),
    ).toBeNull();
  });

  it('rejects a tampered payload', async () => {
    const token = await signOwnerToken({
      siteId: 'site-1',
      userId: 'someone-else',
      host: HOST,
    });
    const [h, , s] = token.split('.');
    const payload = Buffer.from(
      JSON.stringify({
        sub: 'owner-1',
        aud: 'site-owner:site-1',
        host: HOST,
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    ).toString('base64url');
    expect(
      await verifyOwnerToken(`${h}.${payload}.${s}`, {
        siteId: 'site-1',
        host: HOST,
      }),
    ).toBeNull();
  });

  it('rejects garbage', async () => {
    expect(
      await verifyOwnerToken('not-a-jwt', { siteId: 'site-1', host: HOST }),
    ).toBeNull();
  });
});

describe('getSiteManagerFromRequest', () => {
  const OWNER_SITE = { userId: 'owner-1', plan: 'FREE' as const, members: [] };
  const cookieFor = (userId: string) =>
    signOwnerToken({ siteId: SITE.id, userId, host: HOST });

  it('accepts the current owner with a valid cookie on the site host', async () => {
    const loader = vi.fn().mockResolvedValue(OWNER_SITE);
    expect(
      await getSiteManagerFromRequest(
        requestWith(await cookieFor('owner-1')),
        SITE.id,
        loader,
      ),
    ).toBe('owner-1');
    expect(loader).toHaveBeenCalledWith('owner-1');
  });

  it('rejects a cookie whose user no longer owns the site (non-owner)', async () => {
    const loader = vi.fn().mockResolvedValue(OWNER_SITE);
    expect(
      await getSiteManagerFromRequest(
        requestWith(await cookieFor('former-owner')),
        SITE.id,
        loader,
      ),
    ).toBeNull();
  });

  it('accepts an editor of a Premium site with a valid cookie', async () => {
    const loader = vi.fn().mockResolvedValue({
      userId: 'owner-1',
      plan: 'PREMIUM',
      members: [{ userId: 'ed-1' }],
    });
    expect(
      await getSiteManagerFromRequest(
        requestWith(await cookieFor('ed-1')),
        SITE.id,
        loader,
      ),
    ).toBe('ed-1');
    expect(loader).toHaveBeenCalledWith('ed-1');
  });

  it('rejects a cookie for a user who is no longer a member', async () => {
    const loader = vi
      .fn()
      .mockResolvedValue({ userId: 'owner-1', plan: 'PREMIUM', members: [] });
    expect(
      await getSiteManagerFromRequest(
        requestWith(await cookieFor('ed-1')),
        SITE.id,
        loader,
      ),
    ).toBeNull();
  });

  it('rejects an editor once the site is FREE', async () => {
    const loader = vi.fn().mockResolvedValue({
      userId: 'owner-1',
      plan: 'FREE',
      members: [{ userId: 'ed-1' }],
    });
    expect(
      await getSiteManagerFromRequest(
        requestWith(await cookieFor('ed-1')),
        SITE.id,
        loader,
      ),
    ).toBeNull();
  });

  it('is null for a missing site', async () => {
    const loader = vi.fn().mockResolvedValue(null);
    expect(
      await getSiteManagerFromRequest(
        requestWith(await cookieFor('owner-1')),
        SITE.id,
        loader,
      ),
    ).toBeNull();
  });

  it('does not call the loader without a valid cookie', async () => {
    const loader = vi.fn().mockResolvedValue(OWNER_SITE);
    expect(
      await getSiteManagerFromRequest(requestWith(null), SITE.id, loader),
    ).toBeNull();
    expect(
      await getSiteManagerFromRequest(
        requestWith(await cookieFor('owner-1'), 'evil-bob.test.localhost'),
        SITE.id,
        loader,
      ),
    ).toBeNull();
    expect(
      await getSiteManagerFromRequest(requestWith('forged'), SITE.id, loader),
    ).toBeNull();
    expect(loader).not.toHaveBeenCalled();
  });
});

describe('isSameOriginRequest', () => {
  it('accepts an Origin matching the Host', () => {
    expect(
      isSameOriginRequest(
        requestWith(null, HOST, { headers: { origin: `https://${HOST}` } }),
      ),
    ).toBe(true);
  });

  it('rejects a sibling site and a missing Origin', () => {
    expect(
      isSameOriginRequest(
        requestWith(null, HOST, {
          headers: { origin: 'https://evil-bob.test.localhost' },
        }),
      ),
    ).toBe(false);
    expect(isSameOriginRequest(requestWith(null))).toBe(false);
  });
});
