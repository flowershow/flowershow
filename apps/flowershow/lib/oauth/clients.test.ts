import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeDb as db } from './fake-db';

vi.mock('@/server/db', async () => ({
  default: (await import('./fake-db')).fakeDb,
}));

import {
  cleanClientName,
  isCimdClientId,
  validateCimdDocument,
  validateClientMetadata,
} from './client-metadata';
import { registerDcrClient, resolveClient } from './clients';
import { SafeFetchError } from './safe-fetch';

const CIMD_URL = 'https://claude.ai/oauth/mcp-oauth-client-metadata';
const doc = (over: Record<string, unknown> = {}) => ({
  client_id: CIMD_URL,
  client_name: 'Claude',
  redirect_uris: ['https://claude.ai/api/mcp/auth_callback'],
  token_endpoint_auth_method: 'none',
  grant_types: ['authorization_code', 'refresh_token'],
  response_types: ['code'],
  ...over,
});
const jsonResponse = (body: unknown, contentType = 'application/json') => ({
  status: 200,
  contentType,
  body: JSON.stringify(body),
});

beforeEach(() => db.reset());

describe('validateClientMetadata', () => {
  it('accepts a minimal public client', () => {
    const r = validateClientMetadata({
      redirect_uris: ['https://a.example/cb'],
    });
    expect(r).toMatchObject({ ok: true, metadata: { name: 'Unnamed app' } });
  });

  it.each([
    [{}, 'invalid_redirect_uri'],
    [{ redirect_uris: [] }, 'invalid_redirect_uri'],
    [{ redirect_uris: ['http://evil.example/cb'] }, 'invalid_redirect_uri'],
    [{ redirect_uris: ['https://a.example/cb#x'] }, 'invalid_redirect_uri'],
    [
      {
        redirect_uris: Array.from(
          { length: 11 },
          (_, i) => `https://a.example/${i}`,
        ),
      },
      'invalid_redirect_uri',
    ],
    [
      {
        redirect_uris: ['https://a.example/cb'],
        token_endpoint_auth_method: 'client_secret_basic',
      },
      'invalid_client_metadata',
    ],
    [
      { redirect_uris: ['https://a.example/cb'], client_secret: 'x' },
      'invalid_client_metadata',
    ],
    [
      {
        redirect_uris: ['https://a.example/cb'],
        grant_types: ['client_credentials'],
      },
      'invalid_client_metadata',
    ],
    [
      { redirect_uris: ['https://a.example/cb'], grant_types: ['implicit'] },
      'invalid_client_metadata',
    ],
    [
      { redirect_uris: ['https://a.example/cb'], response_types: ['token'] },
      'invalid_client_metadata',
    ],
    [
      { redirect_uris: ['https://a.example/cb'], scope: 'openid' },
      'invalid_client_metadata',
    ],
    [
      {
        redirect_uris: ['https://a.example/cb'],
        logo_uri: 'javascript:alert(1)',
      },
      'invalid_client_metadata',
    ],
    [
      {
        redirect_uris: ['https://a.example/cb'],
        client_uri: 'http://a.example',
      },
      'invalid_client_metadata',
    ],
    [[], 'invalid_client_metadata'],
  ])('rejects %j with %s', (raw, error) => {
    expect(validateClientMetadata(raw)).toMatchObject({ ok: false, error });
  });

  it('strips control and bidi characters from the name and caps its length', () => {
    expect(cleanClientName('Cl‮aude\u0000  App\n')).toBe('Claude App');
    expect(cleanClientName('x'.repeat(500))).toHaveLength(100);
  });
});

describe('CIMD client_id URLs', () => {
  it.each([CIMD_URL, 'https://chatgpt.com/oauth/client.json'])(
    'accepts %s',
    (u) => {
      expect(isCimdClientId(u)).toBe(true);
    },
  );

  it.each([
    'http://claude.ai/oauth/client.json',
    'https://claude.ai',
    'https://claude.ai/',
    'https://claude.ai/oauth/client.json#x',
    'https://u:p@claude.ai/client.json',
    'https://claude.ai/a/../client.json',
    'https://claude.ai/./client.json',
    'https://CLAUDE.ai/client.json', // not canonical
  ])('rejects %s', (u) => {
    expect(isCimdClientId(u)).toBe(false);
  });

  it('requires the document client_id to equal its URL', () => {
    expect(validateCimdDocument(CIMD_URL, doc())).toMatchObject({ ok: true });
    expect(
      validateCimdDocument(
        CIMD_URL,
        doc({ client_id: 'https://evil.example/client.json' }),
      ),
    ).toMatchObject({ ok: false });
    expect(
      validateCimdDocument(CIMD_URL, doc({ client_id: undefined })),
    ).toMatchObject({ ok: false });
  });
});

describe('registerDcrClient', () => {
  it('stores a public client with a generated id', async () => {
    const r = await registerDcrClient({
      client_name: 'Inspector',
      redirect_uris: ['http://localhost:6274/oauth/callback'],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.client.clientId).toMatch(/^dcr_[A-Za-z0-9_-]{24}$/);
    expect(r.client.kind).toBe('DCR');
    expect(db.tables.oAuthClient.size).toBe(1);
  });

  it('stores nothing for invalid metadata', async () => {
    const r = await registerDcrClient({
      redirect_uris: ['http://evil.example/cb'],
    });
    expect(r.ok).toBe(false);
    expect(db.tables.oAuthClient.size).toBe(0);
  });
});

describe('resolveClient', () => {
  it('finds a registered DCR client', async () => {
    const reg = await registerDcrClient({
      redirect_uris: ['https://a.example/cb'],
    });
    if (!reg.ok) throw new Error('setup');
    const r = await resolveClient(reg.client.clientId);
    expect(r).toMatchObject({
      ok: true,
      client: { clientId: reg.client.clientId },
    });
  });

  it('rejects unknown and malformed client ids', async () => {
    expect((await resolveClient('dcr_nope')).ok).toBe(false);
    expect((await resolveClient(undefined)).ok).toBe(false);
    expect((await resolveClient('')).ok).toBe(false);
    expect((await resolveClient('https://claude.ai/')).ok).toBe(false);
  });

  it('fetches, validates and caches a CIMD document for 24h', async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse(doc()));
    const now = new Date('2026-10-18T10:00:00Z');
    const r = await resolveClient(CIMD_URL, { fetch, now });
    expect(r).toMatchObject({
      ok: true,
      client: {
        kind: 'CIMD',
        name: 'Claude',
        redirectUris: ['https://claude.ai/api/mcp/auth_callback'],
      },
    });
    expect(fetch).toHaveBeenCalledWith(CIMD_URL);

    await resolveClient(CIMD_URL, {
      fetch,
      now: new Date(now.getTime() + 23 * 3600e3),
    });
    expect(fetch).toHaveBeenCalledTimes(1);

    fetch.mockResolvedValue(jsonResponse(doc({ client_name: 'Claude 2' })));
    const later = await resolveClient(CIMD_URL, {
      fetch,
      now: new Date(now.getTime() + 25 * 3600e3),
    });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(later).toMatchObject({ ok: true, client: { name: 'Claude 2' } });
    expect(db.tables.oAuthClient.size).toBe(1);
  });

  it('fails closed when a refetch fails (stale cache is not used)', async () => {
    const now = new Date('2026-10-18T10:00:00Z');
    await resolveClient(CIMD_URL, {
      fetch: vi.fn().mockResolvedValue(jsonResponse(doc())),
      now,
    });
    const failing = vi
      .fn()
      .mockRejectedValue(new SafeFetchError('timeout', 'slow'));
    const r = await resolveClient(CIMD_URL, {
      fetch: failing,
      now: new Date(now.getTime() + 25 * 3600e3),
    });
    expect(r).toEqual({
      ok: false,
      description: expect.stringContaining('timeout'),
    });
  });

  it.each([
    [
      'client_id mismatch',
      jsonResponse(doc({ client_id: 'https://evil.example/c.json' })),
      'does not match',
    ],
    ['not JSON content type', jsonResponse(doc(), 'text/html'), 'not JSON'],
    [
      'invalid JSON',
      { status: 200, contentType: 'application/json', body: '{' },
      'not valid JSON',
    ],
    [
      'secret client',
      jsonResponse(doc({ token_endpoint_auth_method: 'client_secret_post' })),
      'public',
    ],
    [
      'bad redirect',
      jsonResponse(doc({ redirect_uris: ['http://evil.example/cb'] })),
      'redirect_uris',
    ],
  ])('rejects a CIMD document: %s', async (_name, response, why) => {
    const r = await resolveClient(CIMD_URL, {
      fetch: vi.fn().mockResolvedValue(response),
    });
    expect(r).toEqual({ ok: false, description: expect.stringContaining(why) });
    expect(db.tables.oAuthClient.size).toBe(0);
  });

  it.each(['blocked_address', 'too_large', 'timeout', 'redirect'] as const)(
    'reports a %s fetch failure without storing anything',
    async (reason) => {
      const r = await resolveClient(CIMD_URL, {
        fetch: vi.fn().mockRejectedValue(new SafeFetchError(reason, reason)),
      });
      expect(r).toEqual({
        ok: false,
        description: expect.stringContaining(reason),
      });
      expect(db.tables.oAuthClient.size).toBe(0);
    },
  );

  it('accepts application/*+json content types', async () => {
    const r = await resolveClient(CIMD_URL, {
      fetch: vi
        .fn()
        .mockResolvedValue(
          jsonResponse(doc(), 'application/oauth-client+json; charset=utf-8'),
        ),
    });
    expect(r.ok).toBe(true);
  });
});
