import { describe, expect, it } from 'vitest';
import { accountResource, anonResource } from './config';
import {
  isAllowedRedirectUri,
  isValidCodeChallenge,
  matchRedirectUri,
  parseResource,
  parseScope,
  s256,
  scopeWithin,
  verifyPkce,
} from './params';

const VERIFIER = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
// RFC 7636 Appendix B test vector.
const CHALLENGE = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM';

describe('PKCE (S256)', () => {
  it('matches the RFC 7636 test vector', () => {
    expect(s256(VERIFIER)).toBe(CHALLENGE);
    expect(verifyPkce(VERIFIER, CHALLENGE)).toBe(true);
  });

  it('rejects a wrong verifier', () => {
    expect(verifyPkce(`${VERIFIER.slice(0, -1)}A`, CHALLENGE)).toBe(false);
  });

  it('rejects the plain method (verifier equal to the challenge)', () => {
    expect(verifyPkce(CHALLENGE, CHALLENGE)).toBe(false);
  });

  it.each([undefined, '', 'short', 'x'.repeat(129), `${VERIFIER}!`, 42])(
    'rejects malformed verifier %j',
    (v) => {
      expect(verifyPkce(v, CHALLENGE)).toBe(false);
    },
  );

  it('accepts only 43-char base64url challenges', () => {
    expect(isValidCodeChallenge(CHALLENGE)).toBe(true);
    expect(isValidCodeChallenge(undefined)).toBe(false);
    expect(isValidCodeChallenge('')).toBe(false);
    expect(isValidCodeChallenge(`${CHALLENGE}=`)).toBe(false);
    expect(isValidCodeChallenge(VERIFIER.slice(0, 42))).toBe(false);
    expect(isValidCodeChallenge(`${CHALLENGE.slice(0, 42)}+`)).toBe(false);
  });
});

describe('scope', () => {
  it('defaults to sites:write when absent', () => {
    expect(parseScope(undefined)).toEqual({ ok: true, scope: 'sites:write' });
    expect(parseScope('')).toEqual({ ok: true, scope: 'sites:write' });
  });

  it('accepts sites:write and collapses duplicates', () => {
    expect(parseScope('sites:write sites:write')).toEqual({
      ok: true,
      scope: 'sites:write',
    });
  });

  it.each(['openid', 'sites:write admin', 'offline_access', 'SITES:WRITE'])(
    'rejects unknown scope %j',
    (s) => {
      expect(parseScope(s)).toEqual({ ok: false });
    },
  );

  it('checks a requested scope is within the grant', () => {
    expect(scopeWithin('sites:write', 'sites:write')).toBe(true);
    expect(scopeWithin('sites:admin', 'sites:write')).toBe(false);
  });
});

describe('resource (RFC 8707)', () => {
  it('defaults to the signed-in MCP endpoint', () => {
    expect(parseResource(undefined)).toEqual({
      ok: true,
      resource: accountResource(),
    });
  });

  it('accepts both MCP URLs exactly', () => {
    expect(parseResource(accountResource())).toEqual({
      ok: true,
      resource: accountResource(),
    });
    expect(parseResource(anonResource())).toEqual({
      ok: true,
      resource: anonResource(),
    });
  });

  it.each([
    () => `${accountResource()}/`,
    () => accountResource().toUpperCase(),
    () => 'https://evil.example/api/mcp/account',
    () => `${accountResource()}?x=1`,
    () => 'https://flowershow.app/api/sites',
  ])('rejects other resources (%#)', (r) => {
    expect(parseResource(r())).toEqual({ ok: false });
  });
});

describe('redirect URIs', () => {
  it.each([
    'https://claude.ai/api/mcp/auth_callback',
    'https://claude.com/api/mcp/auth_callback',
    'https://chatgpt.com/connector_platform_oauth_redirect',
    'https://chatgpt.com/connector/oauth/abc123',
    'http://localhost:6274/oauth/callback',
    'http://127.0.0.1:33418/callback',
    'http://[::1]:8080/cb',
  ])('allows %s', (uri) => {
    expect(isAllowedRedirectUri(uri)).toBe(true);
  });

  it.each([
    'http://example.com/callback', // http off loopback
    'https://example.com/cb#frag', // fragment
    'https://user:pw@example.com/cb', // credentials
    'javascript:alert(1)',
    'cursor://anysphere.cursor-retrieval/oauth/callback', // custom scheme
    'data:text/html,hi',
    '/relative',
    'http://localhost.evil.com/cb',
    'http://127.0.0.2/cb',
  ])('refuses %s', (uri) => {
    expect(isAllowedRedirectUri(uri)).toBe(false);
  });

  const registered = [
    'https://claude.ai/api/mcp/auth_callback',
    'http://localhost:3000/oauth/callback',
  ];

  it('matches an https URI exactly', () => {
    expect(
      matchRedirectUri('https://claude.ai/api/mcp/auth_callback', registered),
    ).toBe(true);
  });

  it.each([
    'https://claude.ai/api/mcp/auth_callback/',
    'https://claude.ai/api/mcp/auth_callback?x=1',
    'https://claude.ai/api/mcp/AUTH_CALLBACK',
    'https://claude.ai:443/api/mcp/auth_callback',
    'https://claude.ai.evil.com/api/mcp/auth_callback',
    'https://claude.ai/api/mcp/auth_callback#x',
    'https://claude.ai/api/mcp/x/../auth_callback',
  ])('does not match a near-miss %s', (uri) => {
    expect(matchRedirectUri(uri, registered)).toBe(false);
  });

  it('ignores the port for loopback http URIs (RFC 8252)', () => {
    expect(
      matchRedirectUri('http://localhost:54321/oauth/callback', registered),
    ).toBe(true);
    expect(
      matchRedirectUri('http://localhost/oauth/callback', registered),
    ).toBe(true);
  });

  it('still requires the same loopback host, path and query', () => {
    expect(matchRedirectUri('http://localhost:54321/other', registered)).toBe(
      false,
    );
    expect(
      matchRedirectUri('http://127.0.0.1:3000/oauth/callback', registered),
    ).toBe(false);
    expect(
      matchRedirectUri('http://localhost:1/oauth/callback?a=1', registered),
    ).toBe(false);
    expect(
      matchRedirectUri('http://localhost:1/x/../oauth/callback', registered),
    ).toBe(false);
  });

  it('never ignores the port for https', () => {
    expect(
      matchRedirectUri(
        'https://claude.ai:8443/api/mcp/auth_callback',
        registered,
      ),
    ).toBe(false);
  });
});
